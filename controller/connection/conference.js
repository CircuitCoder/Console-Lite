class ConferenceConnection {
  constructor(socket, cb) {
    this.listeners = [];

    socket.once('pong', cb);
    this.socket = socket;

    /* Seats */

    this.pushSocketListener('seatsUpdated', ['seats']);

    /* Timers */

    this.pushSocketListener('timerAdded', ['id', 'name', 'type', 'value']);
    this.pushSocketListener('timerStarted', ['id', 'value']);
    this.pushSocketListener('timerReset', ['id', 'value']);
    this.pushSocketListener('timerStopped', ['id']);
    this.pushSocketListener('timerTick', ['id', 'value']);
    this.pushSocketListener('timerUpdated', ['id', 'value']);

    /* Files */

    this.pushSocketListener('fileAdded', ['id', 'name', 'type']);
    this.pushSocketListener('fileEdited', ['id']);

    /* Votes */

    this.pushSocketListener('voteAdded', ['id', 'name', 'target', 'rounds', 'seats']);
    this.pushSocketListener('voteUpdated', ['id', 'index', 'vote']);
    this.pushSocketListener('voteIterated', ['id', 'status']);

    /* Lists*/

    this.pushSocketListener('listAdded', ['id', 'name', 'seats']);
    this.pushSocketListener('listUpdated', ['id', 'seats']);
    this.pushSocketListener('listIterated', ['id', 'ptr']);
  }

  pushSocketListener(name, fields) {
    this.socket.on(name, (data) => {
      for(const l of this.listeners)
        if(name in l) l[name](...fields.map(e => data[e]));
    });
  }


  addListener(listener) {
    this.listeners.push(listener);
  }

  /* Seats */

  updateSeats(seats, cb) {
    this.socket.once('updateSeats', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });
    this.socket.emit('updateSeats', { seats });
  }

  /* Timers */

  addTimer(name, type, value, cb) {
    this.socket.once('addTimer', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    this.socket.emit('addTimer', { name, value, type });
  }

  /**
   * action in { start, restart, stop, reset }
   */
  manipulateTimer(action, id, cb) {
    const token = `${action}Timer`;
    this.socket.once(token, (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit(token, { id });
  }

  updateTimer(id, value, cb) {
    this.socket.once('updateTimer', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('updateTimer', { id, value });
  }

  /* Files */

  addFile(name, type, content, cb) {
    this.socket.once('addFile', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    this.socket.emit('addFile', { name, type, content });
  }

  editFile(id, content, cb) {
    this.socket.once('editFile', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('editFile', { id, content });
  }

  getFile(id, cb) {
    const respToken = `getFile:${id}`;

    this.socket.once(respToken, (data) => {
      if(data.ok) cb(null, data.content);
      else cb(data.error);
    });

    this.socket.emit('getFile', { id });
  }

  /* Votes */
  addVote(name, target, rounds, seats, cb) {
    this.socket.once('addVote', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    this.socket.emit('addVote', { name, target, rounds, seats });
  }

  updateVote(id, index, vote, cb) {
    this.socket.once('updateVote', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('updateVote', { id, index, vote });
  }

  iterateVote(id, status, cb) {
    this.socket.once('iterateVote', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('iterateVote', { id, status });
  }

  /* Lists */
  addList(name, seats, cb) {
    this.socket.once('addList', (data) => {
      if(data.ok) cb(null, data.id);
      else cb(data.error);
    });

    this.socket.emit('addList', { name, seats });
  }

  updateList(id, seats, cb) {
    this.socket.once('updateList', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('updateList', { id, seats });
  }

  iterateList(id, ptr, cb) {
    this.socket.once('iterateList', (data) => {
      if(data.ok) cb(null);
      else cb(data.error);
    });

    this.socket.emit('iterateList', { id, ptr });
  }
}

module.exports = ConferenceConnection;
