const socketIO = require('socket.io');
const backend = require('./backend/main');

let io;
const namespaces = new Map();
let passkey;

function add(nsid) {
  console.log(`Adding namespace: ${nsid}`);
  const nsp = io.of(`/${nsid}`);
  const conf = backend.get(nsid);

  nsp.use((socket, next) => {
    socket.consoleAuthorized = socket.handshake.query['console-passkey'] === passkey;
    socket.conf = backend.get(nsid);
    next();
  });

  nsp.on('connection', (socket) => {
    socket.conf.fetchAll((error, data) => {
      if(error) socket.emit('pong', { error });
      socket.emit('pong', { data });
    });

    socket.on('ping', () => {
      socket.conf.fetchAll((error, data) => {
        if(error) socket.emit('pong', { error });
        socket.emit('pong', { data });
      });
    });

    /* Timers */

    socket.on('addTimer', ({ name, value, type }) => {
      if(!name || !Number.isInteger(value) || !type)
        return void socket.emit('addTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('addTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.addTimer(name, type, value, (err, id) => {
        if(err) return void socket.emit('addTimer', { ok: false, error: err });
        else return void socket.emit('addTimer', { ok: true, id });
      });
    });

    socket.on('startTimer', ({ id }) => {
      if(!id) return void socket.emit('startTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('startTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.startTimer(id, (err) => {
        if(err) return void socket.emit('startTimer', { ok: false, error: err });
        else return void socket.emit('startTimer', { ok: true, id });
      });
    });

    socket.on('restartTimer', ({ id }) => {
      if(!id) return void socket.emit('restartTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('restartTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.restartTimer(id, (err) => {
        if(err) return void socket.emit('restartTimer', { ok: false, error: err });
        else return void socket.emit('restartTimer', { ok: true, id });
      });
    });

    socket.on('resetTimer', ({ id }) => {
      if(!id) return void socket.emit('resetTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('resetTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.resetTimer(id, (err) => {
        if(err) return void socket.emit('resetTimer', { ok: false, error: err });
        else return void socket.emit('resetTimer', { ok: true, id });
      });
    });

    socket.on('stopTimer', ({ id }) => {
      if(!id) return void socket.emit('stopTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('stopTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.stopTimer(id, (err) => {
        if(err) return void socket.emit('stopTimer', { ok: false, error: err });
        else return void socket.emit('stopTimer', { ok: true, id });
      });
    });

    socket.on('updateTimer', ({ id, value }) => {
      if(!id || !Number.isInteger(value))
        return void socket.emit('updateTimer', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('updateTimer', { ok: false, error: 'NotAuthorized' });

      socket.conf.updateTimer(id, value, (err) => {
        if(err) return void socket.emit('updateTimer', { ok: false, error: err });
        else return void socket.emit('updateTimer', { ok: true });
      });
    });

    /* Seats */
    socket.on('updateSeats', ({ seats }) => {
      if(!seats) return void socket.emit('updateSeats', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('updateSeats', { ok: false, error: 'NotAuthorized' });

      socket.conf.updateSeats(seats, err => {
        if(err) return void socket.emit('updateSeats', { ok: false, error: err });
        else return void socket.emit('updateSeats', { ok: true });
      });
    });

    /* Files */

    socket.on('addFile', ({ name, type, content }) => {
      if(!name || !type || !content)
        return void socket.emit('addFile', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('addFile', { ok: false, error: 'NotAuthorized' });

      socket.conf.addFile(name, type, content, (err, id) => {
        if(err) return void socket.emit('addFile', { ok: false, error: err });
        else return void socket.emit('addFile', { ok: true, id });
      });
    });

    socket.on('editFile', ({ id, content }) => {
      if(!id || !content) return void socket.emit('editFile', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('editFile', { ok: false, error: 'NotAuthorized' });

      socket.conf.editFile(id, content, err => {
        if(err) return void socket.emit('editFile', { ok: false, error: err });
        else return void socket.emit('editFile', { ok: true });
      });
    });

    socket.on('getFile', ({ id }) => {
      if(!id) return; // Silently ignores
      const respToken = `getFile:${id}`; // Maybe there are multiple calls
      socket.conf.getFile(id, (err, content) => {
        if(err) return void socket.emit(respToken, { ok: false, error: err });
        return void socket.emit(respToken, { ok: true, content });
      });
    });

    socket.on('addVote', ({ name, rounds, target, seats }) => {
      if(!name || !Number.isInteger(rounds) || !Number.isInteger(target) || !seats)
        return void socket.emit('addVote', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('addVote', { ok: false, error: 'NotAuthorized' });

      socket.conf.addVote(name, rounds, target, seats, (err, id) => {
        if(err) return void socket.emit('addVote', { ok: false, error: err });
        return void socket.emit('addVote', { ok: true, id });
      });
    });

    socket.on('updateVote', ({ id, index, vote }) => {
      if(!id || !Number.isInteger(index) || !Number.isInteger(vote))
        return void socket.emit('updateVote', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('updateVote', { ok: false, error: 'NotAuthorized' });

      socket.conf.updateVote(id, index, vote, err => {
        if(err) return void socket.emit('updateVote', { ok: false, error: err });
        return void socket.emit('updateVote', { ok: true });
      });
    });

    socket.on('iterateVote', ({ id, status }) => {
      if(!id || !status)
        return void socket.emit('iterateVote', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('iterateVote', { ok: false, error: 'NotAuthorized' });

      socket.conf.iterateVote(id, status, err => {
        if(err) return void socket.emit('iterateVote', { ok: false, error: err });
        return void socket.emit('iterateVote', { ok: true });
      });
    });

    /* Lists */

    socket.on('addList', ({ name, seats }) => {
      if(!name || !seats) return void socket.emit('addList', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('addList', { ok: false, error: 'NotAuthorized' });

      socket.conf.addList(name, seats, (err, id) => {
        if(err) return void socket.emit('addList', { ok: false, error: err });
        return void socket.emit('addList', { ok: true, id });
      });
    });

    socket.on('updateList', ({ id, seats }) => {
      if(!id || !seats) return void socket.emit('updateList', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('updateList', { ok: false, error: 'NotAuthorized' });

      socket.conf.updateList(id, seats, err => {
        if(err) return void socket.emit('updateList', { ok: false, error: err });
        return void socket.emit('updateList', { ok: true });
      });
    });

    socket.on('iterateList', ({ id, ptr }) => {
      if(!id || !Number.isInteger(ptr))
        return void socket.emit('iterateList', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('iterateList', { ok: false, error: 'NotAuthorized' });

      socket.conf.iterateList(id, ptr, err => {
        if(err) return void socket.emit('iterateList', { ok: false, error: err });
        return void socket.emit('iterateList', { ok: true });
      });
    });
  });

  conf.addListener({
    timerAdded(id, name, type, value) {
      nsp.emit('timerAdded', { id, name, type, value });
    },

    timerUpdated(id, value) {
      nsp.emit('timerUpdated', { id, value });
    },

    timerTick(id, value) {
      nsp.emit('timerTick', { id, value });
    },

    timerStarted(id, value) {
      nsp.emit('timerStarted', { id, value });
    },

    timerReset(id, value) {
      nsp.emit('timerReset', { id, value });
    },

    timerStopped(id) {
      nsp.emit('timerStopped', { id });
    },

    seatsUpdated(seats) {
      nsp.emit('seatsUpdated', { seats });
    },

    fileAdded(id, name, type) {
      nsp.emit('fileAdded', { id, name, type });
    },

    fileEdited(id) {
      nsp.emit('fileEdited', { id });
    },

    voteAdded(id, name, rounds, target, seats) {
      nsp.emit('voteAdded', { id, name, rounds, target, seats });
    },

    voteUpdated(id, index, vote) {
      nsp.emit('voteUpdated', { id, index, vote });
    },

    voteIterated(id, status) {
      nsp.emit('voteIterated', { id, status });
    },

    listAdded(id, name, seats) {
      nsp.emit('listAdded', { id, name, seats });
    },

    listIterated(id, ptr) {
      nsp.emit('listIterated', { id, ptr });
    },

    listUpdated(id, seats) {
      nsp.emit('listUpdated', { id, seats });
    },
  });

  namespaces.set(nsid, nsp);
}

function init(app, idk, psk) {
  io = socketIO(app);
  passkey = psk;

  io.use((socket, next) => {
    socket.consoleAuthorized = socket.handshake.query['console-passkey'] === passkey;
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('pong', {
      authorized: socket.consoleAuthorized,
      confs: backend.list(),
      idkey: idk,
    });

    socket.on('ping', () => {
      socket.emit('pong', {
        authorized: socket.consoleAuthorized,
        confs: backend.list(),
        idkey: idk,
      });
    });

    socket.on('create', (data) => {
      if(!data.name) return void socket.emit('create', { ok: false, error: 'BadRequest' });
      else if(!socket.consoleAuthorized)
        return void socket.emit('create', { ok: false, error: 'NotAuthorized' });

      backend.add(data.name, (err, id) => {
        if(err) return void socket.emit('create', { ok: false, error: err });

        add(id);
        return void socket.emit('create', { ok: true, id, name: data.name });
      });
    });
  });
}

module.exports = {
  init,
  add,
};
