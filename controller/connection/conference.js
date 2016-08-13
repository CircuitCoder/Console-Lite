class ConferenceConnection {

  constructor(socket, cb) {
    this.listeners = [];

    socket.once('pong', cb);

    socket.on('seatsUpdated', ({ seats }) => {
      if(!seats) {
        console.error('Empty event: seatsUpdated');
        return;
      }

      for(const l of this.listeners)
        if(l.seatsUpdated)
          l.seatsUpdated(seats);
    });
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  updateSeats(seats, cb) {
    socket.once('updateSeats', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });
    socket.emit('updateSeats', { seats });
  }

  addTimer(name, type, value, cb) {
    socket.once('addTimer', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    socket.emit('addTimer', { name, value, type });
  }
}

module.exports = ConferenceConnection;
