const levelup = require('levelup');
const crypto = require('crypto');

const Conference = require('./conference')

const levelopt = {
  valueEncoding: 'json'
};

let main;
const confs = new Map();
let confList;

function init(cb) {
  main = levelup(__dirname + '/storage/main.db', levelopt);
  main.get('list', (err, list) => {
    if(err) {
      if(err.notFound) {
        confList = [];
        return main.put('list', [], cb);
      } else return cb(err);
    } else {
      confList = list;
      for(const conf of list)
        confs.set(conf.id, new Conference(conf.name, levelup(`${__dirname}/storage/${conf.id}.db`, levelopt)));
      return cb(null);
    }
  });
}

function shutdown(cb) {
  main.close((err) => {
    if(err) cb(err);
    else return Promise.all([...confs.keys()].map(e => (resolve, reject) =>
      e.db.close((err) => err ? reject(err) : resolve())
    )).then(() => cb()).catch(cb);
  });
}

function add(name, cb) {
  const id = crypto.randomBytes(16).toString('hex');
  const instance = new Conference(name, levelup(`${__dirname}/storage/${id}.db`, levelopt));
  instance.setup((err) => {
    if(err) return cb(err);
    confs.set(id, instance);
    confList.push({ id, name });

    main.put('list', confList, (err) => err ? cb(err) : cb(null, id));
  });
}

function get(name) {
  if(confs.has(name)) return confs.get(name);
  return undefined;
}

function list() {
  return confList;
}

module.exports = {
  init,
  shutdown,
  add,
  get,
  list,
}
