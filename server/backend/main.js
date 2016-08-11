const levelup = require('levelup');
const crypto = require('crypto');

const Conference = require('./conference')

const levelopt = {
  valueEncoding: 'json'
};

let main;
const confs = new Map();
let confMapping;

function init(cb) {
  main = levelup(__dirname + '/storage/main.db', levelopt);
  main.get('list', (err, list) => {
    if(err) {
      if(err.notFound) {
        confMapping = {};
        return main.put('list', {}, cb);
      } else return cb(err);
    } else {
      confMapping = list;
      for(const conf in list)
        confs.set(conf, new Conference(conf, levelup(`${__dirname}/storage/${list[conf]}.db`, levelopt)));
      return cb(null);
    }
  });
}

function shutdown(cb) {
  main.close((err) => {
    if(err) cb(err);
    else return Promise.all([...confs.values()].map(e => (resolve, reject) =>
      e.db.close((err) => err ? reject(err) : resolve())
    )).then(() => cb()).catch(cb);
  });
}

function add(name, cb) {
  if(confs.has(name)) return cb({ duplicated: true });

  const id = crypto.randomBytes(16).toString('hex');
  const instance = new Conference(name, levelup(`${__dirname}/storage/${id}.db`, levelopt));
  instance.setup();

  confs.set(name, db);
  confMapping[name] = id;

  main.set('list', confMapping, cb);
}

function get(name) {
  if(confs.has(name)) return confs.get(name);
  return undefined;
}

function list() {
  return [...confs.keys()];
}

module.exports = {
  init,
  shutdown,
  add,
  get,
  list,
}
