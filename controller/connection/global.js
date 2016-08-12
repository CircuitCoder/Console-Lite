class GlobalConnection {
  constructor(socket, cb) {
    socket.once('pong', cb);
  }
  
  createConf(name, cb) {
    socket.once('create', cb);
    socket.emit('create', { name });
  }
}

module.exports = GlobalConnection;
