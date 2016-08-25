const Vue = require('vue');
const VueAnimatedList = require('vue-animated-list');
Vue.use(VueAnimatedList);

const io = require('socket.io-client/socket.io.js');
const Push = require('push.js');
const polo = require('polo');
const {ipcRenderer} = require('electron');

const GlobalConnection = require('./connection/global');
const ConferenceConnection = require('./connection/conference');

const util = require('../shared/util.js');

require('../shared/components/timer');
require('../shared/components/timer-input');

let globalConn, confConn;
let serverConfig;

let connectedConf;

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

    services: [],
    showServerFlag: false,

    connectBackendFlag: false,
    backendIDKey: '',
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
    lists: [],

    fileCache: {},
    timerWaitingList: [],

    file: null,
    vote: null,
    searchInput: '',

    projectedVote: null,

    altHold: false,
    backquoteHold: false,
  },

  components: {
    home: require('./views/home/home'),
    seats: require('./views/seats/seats'),
    timers: require('./views/timers/timers'),
    files: require('./views/files/files'),
    votes: require('./views/votes/votes'),
    lists: require('./views/lists/lists'),

    file: require('./views/file/file'),
    vote: require('./views/vote/vote'),
    list: require('./views/list/list'),
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

      const poloRepo = polo();
      poloRepo.on('up', (name, service) => {
        if(name.indexOf('console-lite') !== 0) return;

        this.services.push({
          name,
          idkey: name.substring(13),
          host: service.host,
          port: service.port,
        });
      });

      poloRepo.on('down', (name) => {
        for(let s of this.services)
          if(s.name === name) {
            this.services.$remove(s);
            break;
          }
      });

      setTimeout(() => {
        this.ready = true;
      }, 1000);
    },

    _createGlobalConn() {
      /* Setup display data */
      this.backendPasskey = serverConfig.passkey;
      this.backendIDKey = serverConfig.idkey;
      this.backendUrl = serverConfig.url;

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

    applyService(service) {
      this.backendUrl = `http://${service.host}:${service.port}`;
      this.$els.connectOverlap.scrollTop = this.$els.connectOverlap.scrollHeight - this.$els.connectOverlap.offsetHeight;
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
          alert("启动失败! 请检查是否已经启动另一个 Console Lite 实例");
          console.error(data);
          this.loading = false;
          return;
        }

        serverConfig = data;
        this.showServerFlag = true;

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

        connectedConf = name;

        for(let f of data.files) f.highlight = false;

        for(const list of data.lists) {
          list.timerCurrent = null;
          list.timerTotal = null;
        }

        for(const timer of data.timers) {
          if(timer.type === 'standalone') continue;

          let flag = false;
          for(const l of data.lists) if(l.id === timer.name) {
            if(timer.type === 'list-total')
              l.timerTotal = timer;
            if(timer.type === 'list-current')
              l.timerCurrent = timer;
            flag = true;
            break;
          }

          if(!flag) this.timerWaitingList.push(timer);
        }

        this.timers = data.timers;
        this.seats = data.seats;
        this.files = data.files;
        this.votes = data.votes;
        this.lists = data.lists;

        this.recalcCount();
        util.registerTrie(util.buildTrie(this.seats.filter(e => e.present).map(e => e.name)));

        this.title = name;

        this.activeView = 'home';
        this.frame = true;

        if(this.projOn) this.setupProjector();
      });

      confConn.addListener({
        /* Seats */

        seatsUpdated: (seats) => {
          this.seats = seats;
          this.recalcCount();
          this.sendSeatCount();
          util.registerTrie(util.buildTrie(seats.filter(e => e.present).map(e => e.name)));
        },

        /* Timers */

        timerAdded: (id, name, type, value) => {
          this.timers.unshift({ id, name, value, left: value, type, active: false });
          let flag = false;
          for(const l of this.lists) if(l.id === name) {
            if(type === 'standalone') continue;
            if(type === 'list-total')
              l.timerTotal = this.timers[0];
            if(type === 'list-current')
              l.timerCurrent = this.timers[0];
            flag = true;
            break;
          }

          if(!flag) this.timerWaitingList.push(this.timers[0]);
        },
        
        timerStarted: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.active = true;
            timer.left = value;
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, active: true } });
        },

        timerReset: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.value = value;
            timer.left = value;
          });

          if(this.projOn && proj.mode === 'timer' && proj.timer === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, value } });
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
            if(value === 0 && timer.type === 'standalone') Push.create(timer.name, {
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
        voteAdded: (id, name, target, rounds, seats) => {
          this.votes.unshift({
            id,
            name,
            target,
            rounds,

            status: {
              iteration: 0,
              running: false,
            },

            matrix: seats.map(s => ({ name: s, vote: 0 })),
          });
        },

        voteUpdated: (id, index, vote) => {
          for(let v of this.votes) if(v.id === id) {
            v.matrix[index].vote = vote;

            if(v === this.vote && !v.status.running)
              this.$broadcast('vote-rearrange');

            if(v === this.projectedVote)
              this.sendToProjector({ type: 'update', target: 'vote', data: { event: 'update', rearrange: !v.status.running, index, vote }});

            break;
          }
        },

        voteIterated: (id, status) => {
          for(let v of this.votes) if(v.id === id) {
            v.status = status;

            if(v === this.vote && !status.running)
              this.$broadcast('vote-rearrange');

            if(v === this.projectedVote)
              this.sendToProjector({ type: 'update', target: 'vote', data: { event: 'iterate', rearrange: !status.running, status }});

            break;
          }
        },

        /* Lists */
        listAdded: (id, name, seats) => {
          let timerTotal = undefined;
          let timerCurrent = undefined;
          
          for(let timer of this.timerWaitingList) {
            if(timer.name === id) {
              if(timer.type === 'list-total') timerTotal = timer;
              else if(timer.type === 'list-current') timerCurrent = timer;
            }
          }

          if(timerTotal) this.timerWaitingList.$remove(timerTotal);
          if(timerCurrent) this.timerWaitingList.$remove(timerCurrent);

          this.lists.unshift({
            id, name, seats, timerTotal, timerCurrent, ptr: 0
          });
        },

        listUpdated: (id, seats) => {
          for(const list of this.lists) if(list.id === id) {
            list.seats = seats;
            break;
          }
        },

        listIterated: (id, ptr) => {
          for(const list of this.lists) if(list.id === id) {
            list.ptr = ptr;
            break;
          }
        }
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
      confConn.addTimer(name, 'standalone', sec, (err, id) => {
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
      confConn.iterateVote(id, status, (err, id) => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    projectVote(vote) {
      this.projectedVote = vote;
      this.sendToProjector({ type: 'layer', target: 'vote', data: { vote } });
    },

    /* Lists */
    addList(name, seats, totTime, eachTime) {
      new Promise((resolve, reject) => confConn.addList(name, seats, (err, id) => err ? reject(err) : resolve(id)))
        .then(id => Promise.all([
          new Promise((resolve, reject) => totTime === 0 ? resolve() : confConn.addTimer(id, 'list-total', totTime, err => err ? reject(err) : resolve())),
          new Promise((resolve, reject) => confConn.addTimer(id, 'list-current', eachTime, err => err ? reject(err) : resolve())),
        ])).catch(e => {
          console.error(e);
          alert('添加失败!');
        });
    },

    startList(list) {
      this.manipulateTimer('start', list.timerCurrent.id);
    },

    stopList(list) {
      this.manipulateTimer('stop', list.timerCurrent.id);
    },

    iterateList(list, ptr) {
      Promise.all([
        new Promise((resolve, reject) => confConn.manipulateTimer('reset', list.timerCurrent.id, err => err ? reject(err) : resolve())),
        new Promise((resolve, reject) => confConn.iterateList(list.id, ptr, err => err ? reject(err) : resolve())),
      ]).catch(e => {
        console.error(e);
        alert('更新失败!');
      });
    },

    updateList(list, seats) {
      confConn.updateList(list.id, seats, err => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    updateListTotal(list, time) {
      this.updateTimer(list.timerTotal.id, time);
    },

    updateListCurrent(list, time) {
      this.updateTimer(list.timerCurrent.id, time);
    },

    viewList(list) {
      this.list = list;
      this.activeView = 'list';
    },

    /* Utitlities */

    checkKeyHold(e) {
      if(e.key === 'Alt') this.altHold = true;
      else if(e.key === '`') this.backquoteHold = true;
    },

    checkKeyRelease(e) {
      if(e.key === 'Alt') this.altHold = false;
      else if(e.key === '`') this.backquoteHold = false;
    },

    requestShowServer(e) {
      if(globalConn) this.showServerFlag = true;
    },

    toggleProjector() {
      if(this.projOn) ipcRenderer.send('closeProjector');
      else ipcRenderer.send('openProjector');
    },

    sendConfName() {
      this.sendToProjector({ type: 'update', target: 'title', data: { conf: connectedConf } });
    },

    setupProjector() {
      if(confConn) {
        this.sendToProjector({ type: 'update', target: 'status', data: { connected: true }});
        this.sendConfName();
        this.sendSeatCount();
      } else {
        this.sendToProjector({ type: 'reset' });
      }
    },

    sendToProjector(data) {
      ipcRenderer.send('toProjector', data);
      this.initData = data;
    },
  },

  computed: {
    simpleHalfCount() {
      return Math.floor(this.presentCount / 2) + 1;
    },

    twoThirdCount() {
      return Math.ceil(this.presentCount * 2 / 3);
    },

    twentyPercentCount() {
      return Math.ceil(this.presentCount / 5);
    }
  },
}

function setup() {
  const instance = new Vue(desc);
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
