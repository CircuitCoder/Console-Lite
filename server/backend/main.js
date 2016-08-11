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
      for(const id in list)
        confs.set(id, new Conference(list[id], levelup(`${__dirname}/storage/${id}.db`, levelopt)));
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
    confMapping[id] = name;

    main.put('list', confMapping, (err) => err ? cb(err) : cb(null, id));
  });
}

function get(name) {
  if(confs.has(name)) return confs.get(name);
  return undefined;
}

function list() {
  return [...confs.entries()].reduce((prev, e) => {
    prev[e[0]] = e[1].name;
    return prev;
  }, {});
}

module.exports = {
  init,
  shutdown,
  add,
  get,
  list,
}
