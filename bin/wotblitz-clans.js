#!/usr/bin/env node

var program = require('commander');
var request = require('../lib/request.js')('clans');
var session = require('../lib/session.js');
var types = require('../lib/types.js');
var writer = require('../lib/writer.js')({depth: 3});

module.exports = {
  list: list,
  info: info,
  accountinfo: accountinfo,
  glossary: glossary
};

if (require.main === module) {
  main(
    program
      .option('-s, --search <name|tag>', 'Part of name or tag for clan search (endpoint)')
      .option('-i, --info [clan_ids]', 'Detailed clan information (endpoint)', types.numbers)
      .option('-a, --accountinfo [account_ids]', 'Player clan data (endpoint)', types.numbers)
      .option('-g, --glossary', 'Information on clan entities (endpoint)')
      .option('-f, --fields <fields>', 'selection of fields', types.fields, [])
      .option('-l, --limit <number>', 'limit the clan search results', Number, null)
      .option('-p, --page <number>', 'page through clan search results', Number, 1)
      .option('-e, --extra', 'include more information in "info" and "accountinfo"')
      .parse(process.argv)
  );
}

function main(opts) {
  session.load(function clansSessionLoad(err, sess) {
    if (err) throw err;

    // return to avoid race conditions on save

    if (opts.search) return list(opts.search, opts.limit, opts.page, opts.fields, sess, writer.callback);

    if (opts.info) return info(opts.info, opts.extra ? ['members'] : [], opts.fields, sess, writer.callback);

    if (opts.accountinfo) {
      return accountinfo(
        opts.accountinfo,
        opts.extra ? ['clan'] : [],
        opts.fields,
        sess,
        writer.callback
      );
    }
  });

  if (opts.glossary) glossary(opts.fields, writer.callback);
}

function list(search, limit, pageNumber, fields, sess, callback) {
  request('list', {
    search: search,
    limit: limit,
    page_no: pageNumber,
    fields: fields.join(',')
  }, function listRequestCb(requestErr, data) {
    if (!sess) return callback(requestErr, data);
    if (requestErr) return callback(requestErr);

    var clanId = data.length === 1 ? data[0].clan_id : null;

    if (!clanId) return callback(null, data);

    sess.clan_id = clanId;
    sess.save(function listSessionSaveCb(saveErr) {
      if (saveErr) return callback(saveErr);
      callback(null, data, sess);
    });
  });
}

function info(clanIds, extra, fields, sess, callback) {
  request('info', {
    clan_id: typeof clanIds === 'object' ? clanIds.join(',') : sess.clan_id,
    extra: extra.join(','),
    fields: fields.join(',')
  }, callback);
}

function accountinfo(accountIds, extra, fields, sess, callback) {
  if (typeof accountIds !== 'object') accountIds = [sess.account_id];
  request('accountinfo', {
    account_id: accountIds.join(','),
    extra: extra.join(','),
    fields: fields.join(',')
  }, function accountinfoRequestCb(requestErr, data) {
    if (!sess) return callback(requestErr, data);
    if (requestErr) return callback(requestErr);

    var clanId = accountIds.length === 1 ? data[accountIds[0]].clan_id : null;

    if (!clanId) return callback(null, data);

    sess.clan_id = clanId;
    sess.save(function accountinfoSessionSaveCb(saveErr) {
      if (saveErr) return callback(saveErr);
      callback(null, data, sess);
    });
  });
}

function glossary(fields, callback) {
  request('glossary', {
    fields: fields.join(',')
  }, callback);
}