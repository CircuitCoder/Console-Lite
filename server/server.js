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

module.exports = (cb, port = 4928) => {
  // Initial backend object
  backend.init((err) => {
    if(err) {
      backend.shutdown();
      return void cb(err);
    }

    console.log('Backend initialization completed');

    const passkey = crypto.randomBytes(4).toString('hex');
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
      console.log(`Server ${idkey} up at port ${port} with passkey ${passkey}.`);

      poloRepo.put({
        name: `console-lite-${idkey}`,
        port,
      });

      cb(null, passkey, idkey, shutdown);
    });

    server.on('error', (err) => {
      backend.shutdown();
      cb(err);
    });
  });
};
