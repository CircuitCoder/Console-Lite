const socketIO = require('socket.io');
const backend = require('./backend/main');

let io;
const namespaces = new Map();

function init(app, passkey) {
  io = socketIO(app);

  io.use((socket, next) => {
    socket.consoleAuthorized = socket.request.headers['console-passkey'] === passkey
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('pong', { authorized: socket.consoleAuthorized, confs: backend.list() });

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
  const nsp = io.of(`/${id}`);
  const conf = backend.get(id);

  nsp.use((socket, next) => {
    socket.consoleAuthorized = socket.request.headers['console-passkey'] === passkey
    socket.conf = backend.get(id);
  });

  nsp.on('connection', (socket) => {
    // TODO: return all datas
    socket.on('addTimer', (data) => {
      if(!data.name || !data.value) return socket.emit('addTimer', { ok: false, error: 'BadRequest' });
      socket.conf.addTimer(data.name, 'plain', data.value, (err, id) => {
        if(err) return socket.emit('addTimer', { ok: false, error: err });
        else return socket.emit('addTimer', { ok: true, error: err });
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
  });

  namespaces.set(id, nsp);
};

module.exports = {
  init,
  add,
};
