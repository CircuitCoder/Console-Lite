const vue = require('vue');
const io = require('socket.io-client/socket.io.js');
const Push = require('push.js');
const {ipcRenderer} = require('electron');

const GlobalConnection = require('./connection/global');
const ConferenceConnection = require('./connection/conference');

require('../shared/components/timer');

let globalConn, confConn;
let serverConfig;

/* Data for projector */
let proj = {
  mode: 'none',
};

const desc = {
  el: 'body',
  data: {
    started: false,
    ready: false,
    loading: false,
    picker: false,
    frame: false,

    projOn: false,

    createConfFlag: false,
    confName: '',

    connectBackendFlag: false,
    backendUrl: '',
    backendPasskey: '',

    title: '',

    authorized: false,
    confs: [],

    activeView: 'home',

    presentCount: 0,
    seatCount: 0,
    
    timers: [],
    seats: [],
    files: [],
    votes: [],

    fileCache: {},

    file: null,
    vote: null,
    searchInput: '',
  },

  components: {
    home: require('./views/home/home'),
    seats: require('./views/seats/seats'),
    timers: require('./views/timers/timers'),
    files: require('./views/files/files'),
    votes: require('./views/votes/votes'),

    file: require('./views/file/file'),
    vote: require('./views/vote/vote'),
  },

  methods: {
    init() {
      this.started = true;

      this.projOn = ipcRenderer.sendSync('getProjector') !== null;
      this.sendToProjector({ type: 'reset' });

      ipcRenderer.on('projectorReady', (data) => {
        this.projOn = true;
        this.setupProjector();
      });

      ipcRenderer.on('projectorClosed', (data) => {
        this.projOn = false;
      });

      setTimeout(() => {
        this.ready = true;
      }, 1000);
    },

    _createGlobalConn() {
      socket = io(serverConfig.url, {
        extraHeaders: {
          'Console-Passkey': serverConfig.passkey
        }
      });

      globalConn = new GlobalConnection(socket, ({ confs, authorized }) => {
        this.confs = confs;
        this.authorized = authorized;
        this.picker = true;
        this.connectBackendFlag = false;
        // TODO: failure: reconnect
      });
    },

    connectBackend() {
      this.loading = true;

      this.connectBackendFlag = true;
    },

    performBackendConnection() {
      if(this.backendUrl === '' || this.backendPasskey === '') return;
      serverConfig = {
        url: this.backendUrl,
        passkey: this.backendPasskey,
      };

      this._createGlobalConn();
    },

    discardBackendConnection() {
      this.connectBackendFlag = false;
      this.loading = false;
    },

    createBackend() {
      ipcRenderer.once('serverCallback', (event, data) => {
        if(data.error) {
          alert("启动失败！");
          console.error(data);
          this.loading = false;
          return;
        }

        serverConfig = data;
        this._createGlobalConn();
      });

      ipcRenderer.send('startServer');

      this.loading = true;
    },

    connectConf(id, name) {
      if(confConn && confConn.connected)
        confConn.disconnect();

      console.log(`Connecting to: ${serverConfig.url}/${id}`);

      socket = io(`${serverConfig.url}/${id}`, {
        extraHeaders: {
          'Console-Passkey': serverConfig.passkey
        }
      });

      confConn = new ConferenceConnection(socket, ({ error, data }) => {
        if(error) {
          console.error(error);
          confConn = null;
          alert('连接失败!');
          return;
        }

        for(let f of data.files) f.highlight = false;

        this.timers = data.timers;
        this.seats = data.seats;
        this.files = data.files;
        this.votes = data.votes;

        this.recalcCount();

        this.title = name;

        this.activeView = 'home';
        this.frame = true;
      });

      confConn.addListener({
        /* Seats */

        seatsUpdated: (seats) => {
          this.seats = seats;
          this.recalcCount();
          this.sendSeatCount();
        },

        /* Timers */

        timerAdded: (id, name, type, value) => {
          this.timers.unshift({ id, name, value, left: value, type, active: false });
        },
        
        timerStarted: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.active = true;
            timer.left = value;
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, active: true } });
        },

        timerStopped: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.active = false;
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { active: false } });
        },

        timerUpdated: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.value = value;
            timer.left = value;
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, value } });
        },

        timerTick: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.left = value;
            if(value === 0) Push.create(timer.name, {
              body: '计时结束',
              timeout: 4000,
              icon: __dirname + '/../images/timer.png'
            });
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value } });
        },

        /* Files */

        fileAdded: (id, name, type) => {
          this.files.unshift({ id, name, type, highlight: true });
          Push.create(name, {
            body: '新文件',
            timeout: 4000,
            icon: __dirname + '/../images/folder.png'
          });
        },

        fileEdited: (id) => {
          this.fileCache[id] = null;

          for(let f of this.files)
            if(f.id === id)
              f.highlight = true;

          if(this.activeView === 'file' && this.file && this.file.id === id) {
            this.activeView = 'files';
          }

          Push.create(name, {
            body: '文件更新',
            timeout: 4000,
            icon: __dirname + '/../images/folder.png'
          });

          //TODO: refetch if on projector
        },

        /* Votes */
        voteAdded: (id, name, target, round, seats) => {
          this.votes.unshift({
            id,
            name,
            target,
            round,

            iteration: 0,
            running: false,
            matrix: seats.map(s => ({ name: s, vote: 0 })),
          });
        },

        voteUpdated: (id, index, vote) => {
          for(let v of this.votes) if(v.id === id) {
            v.matrix[index].vote = vote;
            break;
          }
        },

        voteIterated: (id, status) => {
          for(let v of this.votes) if(v.id === id) {
            v.matrix[index].status = status;
            break;
          }
        },
      });
    },

    createConf(name) {
      this.confName = '';
      this.createConfFlag = true;
      setTimeout(() => this.$els.confNameInput.focus(), 0);
    },

    performConfCreation() {
      if(this.confName === '') return;
      globalConn.createConf(this.confName, (data) => {
        if(!data.ok) {
          console.error(data.error);
          alert('创建失败');
        } else {
          this.confs.push({ id: data.id, name: data.name });
          this.createConfFlag = false;
        }
      });
    },

    discardConfCreation() {
      this.createConfFlag = false;
    },

    selectConf() {
      this.picker = true;
      this.frame = false;
    },

    navigate(dest, data) {
      this.activeView = dest;
      this.searchInput = '';
      if(data) {
        if(data.search)
          this.searchInput = data.search;
      }
    },

    /* Seats */

    updateSeats(seats) {
      // Sync up, recalculate will be completed on pingback event
      confConn.updateSeats(seats, err => {
        if(err) {
          console.error(err);
          alert('修改失败!');
        }
      });
    },

    recalcCount() {
      this.seatCount = this.seats.length;
      this.presentCount = this.seats.reduce((prev, e) => e.present ? prev+1 : prev, 0);
    },

    sendSeatCount() {
      this.sendToProjector({ type: 'update', target: 'seats', data: { seat: this.seatCount, present: this.presentCount } });
    },

    /* Timers */

    addTimer(name, sec) {
      confConn.addTimer(name, 'plain', sec, (err, id) => {
        if(err) {
          console.error(err);
          alert('添加失败!');
        }
      });
    },

    manipulateTimer(action, id) {
      confConn.manipulateTimer(action, id, (err, id) => {
        if(err) {
          console.error(err);
          alert('操作失败!');
        }
      });
    },

    updateTimer(id, value) {
      confConn.updateTimer(id, value, (err, id) => {
        if(err) {
          console.error(err);
          alert('修改失败!');
        }
      });
    },

    projectTimer(timer) {
      this.sendToProjector({ type: 'layer', target: 'timer', data: timer });
      proj.mode = 'timer';
      proj.timer = timer.id;
    },

    executeOnTimer(id, cb) {
      for(const timer of this.timers)
        if(timer.id === id) {
          cb(timer);
          break;
        }
    },

    /* Files */

    addFile(name, type, content) {
      confConn.addFile(name, type, content, err => {
        if(err) {
          console.error(err);
          alert('添加失败!');
        }
      });
    },

    editFile(id, content) {
      confConn.editFile(id, content, err => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    getFile(id, cb) {
      if(this.fileCache[id]) return cb(null, this.fileCache[id]);
      confConn.getFile(id, (err, doc) => {
        if(err) return cb(err);

        this.fileCache[id] = doc;
        return cb(null, doc);
      });
    },

    viewFile(file) {
      file.highlight = false;

      this.file = file;
      this.activeView = 'file';
    },

    projectFile(file) {
      this.getFile(file.id, (err, content) => {
        console.log(content);
        if(err) {
          console.error(err);
          return alert('获取文件失败');
        }

        this.sendToProjector({ type: 'layer', target: 'file', data: { meta: file, content: new Uint8Array(content) }});
      });
    },

    /* Vote */
    addVote(name, target, rounds, seats) {
      confConn.addVote(name, target, rounds, seats, (err, id) => {
        if(err) {
          console.error(err);
          alert('添加失败!');
        }
      });
    },

    viewVote(vote) {
      /*
       * votes array is never replaced entirely
       * So it's save to keep a reference of a specific vote
       */

      console.log(vote);
      this.vote = vote;
      this.activeView = 'vote';
    },

    updateVote(id, index, vote) {
      confConn.updateVote(id, index, vote, (err, id) => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    iterateVote(id, status) {
      confConn.updateVote(id, status, (err, id) => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    /* Utitlities */

    toggleProjector() {
      if(this.projOn) ipcRenderer.send('closeProjector');
      else ipcRenderer.send('openProjector');
    },

    setupProjector() {
      this.sendSeatCount();
    },

    sendToProjector(data) {
      ipcRenderer.send('toProjector', data);
      this.initData = data;
    },
  }
}

function setup() {
  const instance = new vue(desc);
  instance.init();

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}
