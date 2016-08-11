class GlobalConnection {
  constructor(socket, cb) {
    socket.once('pong', (data) => {
      cb(data);
    });
  }
  
  createConf(name, cb) {
    socket.once('create', cb);
    socket.emit('create', { name });
  }
}

module.exports = GlobalConnection;
