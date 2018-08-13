const backend = require('./backend/main');
const socket = require('./socket.js');

const polo = require('polo');
const poloRepo = polo();

const crypto = require('crypto');
const http = require('http');

function shutdown(cb) {
  console.log('Shuting down backend...');
  return backend.shutdown(cb);
}

module.exports = (cb, opts) => {
  // Initial backend object
  backend.init(err => {
    if(err) {
      backend.shutdown();
      return void cb(err);
    }

    console.log('Backend initialization completed');

    let port;
    let hint;
    let passkey;
    if(opts) {
      port = opts.port;
      hint = opts.hint;
      passkey = opts.passkey;
    }

    if(!port) port = 4928;
    if(!passkey) passkey = crypto.randomBytes(4).toString('hex');

    const idkey = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Setup sockets
    const server = http.createServer((req, res) => {
      res.writeHead(404);
      res.end('Please use socket.io to connect.');
    });

    socket.init(server, idkey, passkey);
    const confs = backend.list();
    for(const conf of confs) socket.add(conf.id);

    server.listen(port, () => {
      let ident = idkey;
      if(hint) ident = `${idkey}:${hint}`;

      console.log(`Server ${ident} up at port ${port} with passkey ${passkey}.`);

      poloRepo.put({
        name: `console-lite-${ident}`,
        port,
      });

      cb(null, passkey, idkey, port, shutdown);
    });

    server.on('error', err => {
      backend.shutdown();
      cb(err);
    });
  });
};
