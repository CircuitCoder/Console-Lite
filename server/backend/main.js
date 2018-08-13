const levelup = require('levelup');
const encodingDown = require('encoding-down');
const leveldown = require('leveldown');

const crypto = require('crypto');
const path = require('path');

const { dbPath, filePath } = require('../util');

const Conference = require('./conference');

let main;
const confs = new Map();
let confList;

function startDB(dir, cb) {
  const levelBackend = encodingDown(
    leveldown(dir),
    { valueEncoding: 'json' },
  );

  return levelup(levelBackend, null, cb);
}

function init(cb) {
  main = startDB(dbPath('main'), err => {
    if(err) return void cb(err);

    main.get('list', (err, list) => {
      if(err)
        if(err.notFound) {
          confList = [];
          return void main.put('list', [], cb);
        } else return void cb(err);
      else {
        confList = list;
        for(const conf of list) {
          const db = startDB(dbPath(conf.id));
          const filedir = filePath(conf.id);
          confs.set(conf.id, new Conference(conf.name, db, filedir));
        }
        return void cb(null);
      }
    });
  });
}

function shutdown(cb) {
  main.close(err => {
    if(err) {
      if(cb) return void cb(err);
      return;
    }

    Promise.all([...confs.values()].map(
      e => new Promise((resolve, reject) => e.db.close(err => err ? reject(err) : resolve())),
    ))
      .then(() => {
        if(cb) cb();
      })
      .catch(e => {
        if(cb) cb(e);
      });
  });
}

function add(name, cb) {
  const id = crypto.randomBytes(16).toString('hex');

  const db = startDB(dbPath(id));
  const filedir = filePath(id);
  const instance = new Conference(name, db, filedir);
  instance.setup(err => {
    if(err) return void cb(err);
    confs.set(id, instance);
    confList.push({ id, name });

    main.put('list', confList, err => err ? cb(err) : cb(null, id));
  });
}

function get(name) {
  if(confs.has(name)) return confs.get(name);
  return null;
}

function _list() {
  return confList;
}

module.exports = {
  init,
  shutdown,
  add,
  get,
  list: _list,
};
