const socketIO = require('socket.io');
const backend = require('./backend/main');

let io;
const namespaces = new Map();
let passkey;

function init(app, psk) {
  io = socketIO(app);
  passkey = psk;

  io.use((socket, next) => {
    socket.consoleAuthorized = socket.request.headers['console-passkey'] === passkey
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('pong', { authorized: socket.consoleAuthorized, confs: backend.list() });

    socket.on('ping', (data) => {
      socket.emit('pong', { authorized: socket.consoleAuthorized, confs: backend.list() });
    });

    socket.on('create', (data) => {
      // TODO: check authorized
      if(!data.name) return socket.emit('create', { ok: false, error: 'BadRequest' });

      backend.add(data.name, (err, id) => {
        if(err) return socket.emit('create', { ok: false, error: err });

        add(id);
        return socket.emit('create', { ok: true, id: id, name: data.name });
      });
    });
  });
};

function add(id) {
  console.log(`Adding namespace: ${id}`);
  const nsp = io.of(`/${id}`);
  const conf = backend.get(id);

  nsp.use((socket, next) => {
    socket.consoleAuthorized = socket.request.headers['console-passkey'] === passkey;
    socket.conf = backend.get(id);
    next();
  });

  nsp.on('connection', (socket) => {
    socket.conf.fetchAll((error, data) => {
      if(error) socket.emit('pong', { error });
      socket.emit('pong', { data });
    });

    socket.on('ping', (data) => {
      socket.conf.fetchAll((error, data) => {
        if(error) socket.emit('pong', { error });
        socket.emit('pong', { data });
      });
    });

    socket.on('addTimer', (data) => {
      if(!data.name || !data.value || !data.type) return socket.emit('addTimer', { ok: false, error: 'BadRequest' });
      socket.conf.addTimer(data.name, data.type, data.value, (err, id) => {
        if(err) return socket.emit('addTimer', { ok: false, error: err });
        else return socket.emit('addTimer', { ok: true, id });
      });
    });

    socket.on('startTimer', (data) => {
      if(!data.id) return socket.emit('startTimer', { ok: false, error: 'BadRequest' });
      socket.conf.startTimer(data.id);
      return socket.emit('startTimer', { ok: true });
    });

    socket.on('stopTimer', (data) => {
      if(!data.id) return socket.emit('stopTimer', { ok: false, error: 'BadRequest' });
      socket.conf.stopTimer(data.id);
      return socket.emit('stopTimer', { ok: true });
    });

    socket.on('updateTimer', (data) => {
      if(!data.id || !data.value) return socket.emit('updateTimer', { ok: false, error: 'BadRequest' });
      socket.conf.updateTimer(data.id, data.value, (err) => {
        if(err) return socket.emit('updateTimer', { ok: false, error: err });
        else return socket.emit('updateTimer', { ok: true });
      });
    });

    socket.on('updateSeats', (data) => {
      if(!data.seats) return socket.emit('updateSeats', { ok: false, error: 'BadRequest' });
      socket.conf.updateSeats(data.seats, err => {
        if(err) return socket.emit('updateSeats', { ok: false, error: err });
        else return socket.emit('updateSeats', { ok: true });
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

    timerStarted(id) {
      nsp.emit('timerStarted', { id });
    },

    timerStopped(id) {
      nsp.emit('timerStopped', { id });
    },

    seatsUpdated(seats) {
      nsp.emit('seatsUpdated', { seats });
    },
  });

  namespaces.set(id, nsp);
};

module.exports = {
  init,
  add,
};
