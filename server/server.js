const backend = require('./backend/main');
const socket= require('./socket.js');

const crypto = require('crypto');
const http = require('http');

function shutdown(cb) {
  console.log('Shuting down backend...')
  return backend.shutdown(cb);
}

module.exports = (cb, port = 4928) => {
  // Initial backend object
  backend.init((err) => {
    if(err) {
      backend.shutdown();
      return cb(err);
    }

    console.log('Backend initialization completed');

    const passkey = crypto.randomBytes(4).toString('hex');

    // Setup sockets 
    const server = http.createServer((req, res) => {
      res.writeHead(404);
      res.end('Please use socket.io to connect.');
    });

    socket.init(server);
    const confs = backend.list();
    for(const conf in confs) socket.add(conf);

    server.listen(port, (err) => {
      if(err) {
        backend.shutdown();
        cb(err);
      } else {
        console.log(`Server up at port ${port}.`);
        cb(null, passkey, shutdown);
      }
    });
  });
}
