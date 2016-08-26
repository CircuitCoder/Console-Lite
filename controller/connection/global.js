class GlobalConnection {
  constructor(socket, cb) {
    socket.once('pong', cb);

    this.socket = socket;
  }

  createConf(name, cb) {
    this.socket.once('create', cb);
    this.socket.emit('create', { name });
  }
}

module.exports = GlobalConnection;
