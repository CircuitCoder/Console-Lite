function hexToUint8A(hex) {
  const buf = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buf);
  for(let i = 0; i < hex.length / 2; ++i)
    view[i] = parseInt(hex.charAt(i * 2), 16) * 16 + parseInt(hex.charAt(i * 2 + 1), 16);
  return view;
}

class ConferenceConnection {
  constructor(socket, cb) {
    this.listeners = [];

    socket.once('pong', cb)

    /* Seats */

    socket.on('seatsUpdated', ({ seats }) => {
      if(!seats) {
        console.error('Empty event: seatsUpdated');
        return;
      }

      for(const l of this.listeners)
        if(l.seatsUpdated)
          l.seatsUpdated(seats);
    });

    /* Timers */

    socket.on('timerAdded', ({ id, name, type, value }) => {
      for(const l of this.listeners)
        if(l.timerAdded) l.timerAdded(id, name, type, value);
    });

    socket.on('timerStarted', ({ id, value }) => {
      for(const l of this.listeners)
        if(l.timerStarted) l.timerStarted(id, value);
    });

    socket.on('timerStopped', ({ id }) => {
      for(const l of this.listeners)
        if(l.timerStopped) l.timerStopped(id);
    });

    socket.on('timerTick', ({ id, value }) => {
      for(const l of this.listeners)
        if(l.timerTick) l.timerTick(id, value);
    });

    socket.on('timerUpdated', ({ id, value }) => {
      for(const l of this.listeners)
        if(l.timerUpdated) l.timerUpdated(id, value);
    });

    /* Files */

    socket.on('fileAdded', ({ id, name, type }) => {
      for(const l of this.listeners)
        if(l.fileAdded) l.fileAdded(id, name, type);
    });

    socket.on('fileEdited', ({ id }) => {
      for(const l of this.listeners)
        if(l.fileEdited) l.fileEdited(id);
    });

    socket.on('voteAdded', ({ id, name, target, rounds, seats }) => {
      for(const l of this.listeners)
        if(l.voteAdded) l.voteAdded(id, name, target, rounds, seats);
    });

    socket.on('voteUpdated', ({ id, index, vote }) => {
      for(const l of this.listeners)
        if(l.voteUpdated) l.voteUpdated(id, index, vote);
    });

    socket.on('voteIterated', ({ id, status }) => {
      for(const l of this.listeners)
        if(l.voteIterated) l.voteIterated(id, status);
    });
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  /* Seats */

  updateSeats(seats, cb) {
    socket.once('updateSeats', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });
    socket.emit('updateSeats', { seats });
  }

  /* Timers */

  addTimer(name, type, value, cb) {
    socket.once('addTimer', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    socket.emit('addTimer', { name, value, type });
  }

  /**
   * action in { start, restart, stop }
   */
  manipulateTimer(action, id, cb) {
    const token = `${action}Timer`;
    socket.once(token, (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    socket.emit(token, { id });
  }

  updateTimer(id, value, cb) {
    socket.once('updateTimer', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    socket.emit('updateTimer', { id, value });
  }

  /* Files */

  addFile(name, type, content, cb) {
    socket.once('addFile', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    socket.emit('addFile', { name, type, content });
  }

  editFile(id, content, cb) {
    socket.once('editFile', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    socket.emit('editFile', { id, content });
  }

  getFile(id, cb) {
    const respToken = `getFile:${id}`;

    socket.once(respToken, (data) => {
      if(data.ok) cb(null, data.content)
      else cb(data.error);
    });

    socket.emit('getFile', { id });
  }

  /* Votes */
  addVote(name, target, rounds, seats, cb) {
    socket.once('addVote', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    socket.emit('addVote', { name, target, rounds ,seats });
  }

  updateVote(id, index, vote, cb) {
    socket.once('updateVote', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });
    
    socket.emit('updateVote', { id, index, vote });
  }

  iterateVote(id, status) {
    socket.once('iterateVote', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    socket.emit('iterateVote', { id, index });
  }
}

module.exports = ConferenceConnection;
