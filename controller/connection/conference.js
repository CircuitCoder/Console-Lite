class ConferenceConnection {
  constructor(socket, cb) {
    socket.once('pong', cb);
  }
}

module.exports = ConferenceConnection;
