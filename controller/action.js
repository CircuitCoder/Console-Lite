const Vue = require('vue');
const VueAnimatedList = require('vue-animated-list');
Vue.use(VueAnimatedList);

const io = require('socket.io-client');
const Push = require('push.js');
const polo = require('polo');
const path = require('path');
const { ipcRenderer, shell } = require('electron');
const { clipboard } = require('electron').remote;

const GlobalConnection = require('./connection/global');
const ConferenceConnection = require('./connection/conference');

const util = require('../shared/util.js');

require('../shared/components/timer');
require('../shared/components/timer-input');

let globalConn;
let confConn;

let serverConfig;

let connectedConf;

const desc = {
  el: 'body',
  data: {
    started: false,
    ready: false,
    loading: false,
    picker: false,
    frame: false,
    server: false,

    projOn: false,
    proj: {
      mode: 'none',
      target: null,
    },

    createConfFlag: false,
    confName: '',

    services: [],
    showServerFlag: false,

    advancedBackendFlag: false,
    backendPort: 4928,
    backendHint: null,
    backendPasskeySetting: null,

    connectBackendFlag: false,
    backendIDKey: '',
    backendUrl: '',
    backendPasskey: '',
    copied: null,
    copiedDiscarder: null,

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
    list: null,
    searchInput: '',

    altHold: false,
    backquoteHold: false,

    pendingListSync: null,
  },

  /* eslint-disable global-require */
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
  /* eslint-enable global-require */

  methods: {
    init() {
      this.started = true;

      this.server = ipcRenderer.sendSync('isServerRunning');
      this.projOn = ipcRenderer.sendSync('getProjector') !== null;
      this.sendToProjector({ type: 'reset' });

      ipcRenderer.on('projectorReady', () => {
        this.projOn = true;
        this.setupProjector();
      });

      ipcRenderer.on('projectorClosed', () => {
        this.projOn = false;
      });

      const poloRepo = polo();
      poloRepo.on('up', (name, service) => {
        if(name.indexOf('console-lite') !== 0) return;

        const ident = name.substring(13);
        const matched = ident.match(/^([0-9A-F]+):(.*)$/);
        let hint = null;
        let idkey = ident;
        if(matched) {
          idkey = matched[1];
          hint = matched[2];
        }

        this.services.push({
          name,
          hint,
          idkey,
          host: service.host,
          port: service.port,
        });
      });

      poloRepo.on('down', name => {
        for(const s of this.services)
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

      const socket = io(serverConfig.url, {
        query: `console-passkey=${serverConfig.passkey}`,
      });

      globalConn = new GlobalConnection(socket, ({ confs, authorized, idkey }) => {
        this.confs = confs;
        this.authorized = authorized;

        if(!this.authorized)
          if(serverConfig.passkey && !confirm('密码错误，是否在只读模式连接?')) {
            this.confs = null;
            this.authorized = false;
            this.connectBackendFlag = true;

            globalConn = null;
            return;
          }

        this.backendIDKey = idkey;

        this.picker = true;
        this.connectBackendFlag = false;
        // TODO: failure: reconnect
      });
    },

    applyService(service) {
      this.backendUrl = `http://${service.host}:${service.port}`;

      /* eslint-disable-next-line */ // Overflows
      this.$els.connectOverlap.scrollTop =
        this.$els.connectOverlap.scrollHeight - this.$els.connectOverlap.offsetHeight;
    },

    connectBackend() {
      this.loading = true;

      this.connectBackendFlag = true;
    },

    performBackendConnection() {
      if(this.backendUrl === '') return;
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
          alert('启动失败! 请检查是否已经启动另一个 Console Lite 实例');
          console.error(data);
          this.loading = false;
          return;
        }

        serverConfig = data;
        this.showServerFlag = true;

        this._createGlobalConn();
      });

      const port = parseInt(this.backendPort, 10);
      if(Number.isNaN(port)) return;
      const hint = this.backendHint || null;
      const passkey = this.backendPasskeySetting || null;

      this.advancedBackendFlag = false;
      ipcRenderer.send('startServer', { port, hint, passkey });

      this.loading = true;
    },

    advancedBackend() {
      this.advancedBackendFlag = true;
      this.loading = true;
    },

    discardAdvancedBackend() {
      this.advancedBackendFlag = false;
      this.loading = false;
    },

    connectConf(confId, confName) {
      if(confConn && confConn.connected)
        confConn.disconnect();

      console.log(`Connecting to: ${serverConfig.url}/${confId}`);

      const socket = io(`${serverConfig.url}/${confId}`, {
        query: `console-passkey=${serverConfig.passkey}`,
      });

      confConn = new ConferenceConnection(socket, ({ error, data }) => {
        if(error) {
          console.error(error);
          confConn = null;
          alert('连接失败!');
          return;
        }

        connectedConf = confName;

        for(const f of data.files) f.highlight = false;

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

        this.title = confName;

        this.activeView = 'home';
        this.frame = true;

        if(this.projOn) this.setupProjector();
      });

      confConn.addListener({
        /* Seats */

        seatsUpdated: seats => {
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

          if(this.projOn && this.proj.mode === 'timer' && this.proj.target === id)
            this.sendToProjector({
              type: 'update',
              target: 'timer',
              data: { left: value, active: true },
            });
          else if(this.projOn && this.proj.mode === 'list') {
            const l = this.proj.target;
            if((l.timerCurrent && l.timerCurrent.id === id)
               || (l.timerTotal && l.timerTotal.id === id))
              this.syncProjectorList();
          }
        },

        timerReset: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.value = value;
            timer.left = value;
          });

          if(this.projOn && this.proj.mode === 'timer' && this.proj.target === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, value } });
          else if(this.projOn && this.proj.mode === 'list') {
            const l = this.proj.target;
            if((l.timerCurrent && l.timerCurrent.id === id)
               || (l.timerTotal && l.timerTotal.id === id))
              this.syncProjectorList();
          }
        },

        timerStopped: id => {
          this.executeOnTimer(id, timer => {
            timer.active = false;
          });

          if(this.projOn && this.proj.mode === 'timer' && this.proj.target === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { active: false } });
          else if(this.projOn && this.proj.mode === 'list') {
            const l = this.proj.target;
            if((l.timerCurrent && l.timerCurrent.id === id)
               || (l.timerTotal && l.timerTotal.id === id))
              this.syncProjectorList();
          }
        },

        timerUpdated: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.value = value;
            timer.left = value;
          });

          if(this.projOn && this.proj.mode === 'timer' && this.proj.target === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value, value } });
          else if(this.projOn && this.proj.mode === 'list') {
            const l = this.proj.target;
            if((l.timerCurrent && l.timerCurrent.id === id)
               || (l.timerTotal && l.timerTotal.id === id))
              this.syncProjectorList();
          }
        },

        timerTick: (id, value) => {
          this.executeOnTimer(id, timer => {
            timer.left = value;
            if(value === 0 && timer.type === 'standalone') Push.create(timer.name, {
              body: '计时结束',
              timeout: 4000,
              icon: path.join(__dirname, '..', 'images', 'timer.png'),
            });
          });

          if(this.projOn && this.proj.mode === 'timer' && this.proj.target === id)
            this.sendToProjector({ type: 'update', target: 'timer', data: { left: value } });
          else if(this.projOn && this.proj.mode === 'list') {
            const l = this.proj.target;
            if((l.timerCurrent && l.timerCurrent.id === id)
               || (l.timerTotal && l.timerTotal.id === id))
              this.syncProjectorList();
          }
        },

        /* Files */

        fileAdded: (id, name, type) => {
          this.files.unshift({ id, name, type, highlight: true });
          Push.create(name, {
            body: '新文件',
            timeout: 4000,
            icon: path.join(__dirname, '..', 'images', 'folder.png'),
          });
        },

        fileEdited: id => {
          this.fileCache[id] = null;

          for(const f of this.files)
            if(f.id === id)
              f.highlight = true;

          if(this.activeView === 'file' && this.file && this.file.id === id)
            this.activeView = 'files';

          Push.create(name, {
            body: '文件更新',
            timeout: 4000,
            icon: path.join(__dirname, '..', 'images', 'folder.png'),
          });

          // TODO: refetch if on projector
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
          for(const v of this.votes) if(v.id === id) {
            v.matrix[index].vote = vote;

            if(v === this.vote && !v.status.running)
              this.$broadcast('vote-rearrange');

            if(this.proj.mode === 'vote' && v === this.proj.target)
              this.sendToProjector({
                type: 'update',
                target: 'vote',
                data: { event: 'update', rearrange: !v.status.running, index, vote },
              });

            break;
          }
        },

        voteIterated: (id, status) => {
          for(const v of this.votes) if(v.id === id) {
            v.status = status;

            if(v === this.vote && !status.running)
              this.$broadcast('vote-rearrange');

            if(this.proj.mode === 'vote' && v === this.proj.target)
              this.sendToProjector({
                type: 'update',
                target: 'vote',
                data: { event: 'iterate', rearrange: !status.running, status },
              });

            break;
          }
        },

        /* Lists */
        listAdded: (id, name, seats) => {
          let timerTotal;
          let timerCurrent;

          for(const timer of this.timerWaitingList)
            if(timer.name === id)
              if(timer.type === 'list-total') timerTotal = timer;
              else if(timer.type === 'list-current') timerCurrent = timer;

          if(timerTotal) this.timerWaitingList.$remove(timerTotal);
          if(timerCurrent) this.timerWaitingList.$remove(timerCurrent);

          this.lists.unshift({
            id, name, seats, timerTotal, timerCurrent, ptr: 0,
          });
        },

        listUpdated: (id, seats) => {
          for(const list of this.lists) if(list.id === id) {
            list.seats = seats;

            if(this.proj.mode === 'list' && this.proj.target === list)
              this.syncProjectorList();

            break;
          }
        },

        listIterated: (id, ptr) => {
          for(const list of this.lists) if(list.id === id) {
            list.ptr = ptr;

            if(this.proj.mode === 'list' && this.proj.target === list)
              this.syncProjectorList();

            break;
          }
        },
      });
    },

    createConf() {
      this.confName = '';
      this.createConfFlag = true;
      setTimeout(() => this.$els.confNameInput.focus(), 0);
    },

    performConfCreation() {
      if(this.confName === '') return;
      globalConn.createConf(this.confName, data => {
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
      if(data) if(data.search)
        this.searchInput = data.search;
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
      this.presentCount = this.seats.reduce((prev, e) => e.present ? prev + 1 : prev, 0);
    },

    sendSeatCount() {
      this.sendToProjector({
        type: 'update',
        target: 'seats',
        data: { seat: this.seatCount, present: this.presentCount },
      });
    },

    /* Timers */

    addTimer(name, sec) {
      confConn.addTimer(name, 'standalone', sec, err => {
        if(err) {
          console.error(err);
          alert('添加失败!');
        }
      });
    },

    manipulateTimer(action, id) {
      confConn.manipulateTimer(action, id, err => {
        if(err) {
          console.error(err);
          alert('操作失败!');
        }
      });
    },

    updateTimer(id, value) {
      confConn.updateTimer(id, value, err => {
        if(err) {
          console.error(err);
          alert('修改失败!');
        }
      });
    },

    projectTimer(timer) {
      this.sendToProjector({ type: 'layer', target: 'timer', data: timer });
      this.proj.mode = 'timer';
      this.proj.target = timer.id;
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
      if(this.fileCache[id]) cb(null, this.fileCache[id]);
      return confConn.getFile(id, (err, doc) => {
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

        this.proj.mode = 'file';

        return this.sendToProjector({
          type: 'layer',
          target: 'file',
          data: { meta: file, content },
        });
      });
    },

    /* Vote */
    addVote(name, target, rounds, seats) {
      confConn.addVote(name, target, rounds, seats, err => {
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
      confConn.updateVote(id, index, vote, err => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    iterateVote(id, status) {
      confConn.iterateVote(id, status, err => {
        if(err) {
          console.error(err);
          alert('更新失败!');
        }
      });
    },

    projectVote(vote) {
      this.proj.mode = 'vote';
      this.proj.target = vote;
      this.sendToProjector({ type: 'layer', target: 'vote', data: { vote } });
    },

    /* Lists */
    addList(name, seats, totTime, eachTime) {
      new Promise((resolve, reject) => confConn.addList(name, seats, (err, id) => err ? reject(err) : resolve(id)))
        .then(id => Promise.all([
          new Promise((resolve, reject) => confConn.addTimer(id, 'list-total', totTime, err => err ? reject(err) : resolve())),
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

    projectList(list) {
      this.proj.mode = 'list';
      this.proj.target = list;
      this.sendToProjector({ type: 'layer', target: 'list', data: { list: this.proj.target } });
    },

    /**
     * Because lists are just too complicated,
     * We are doing global syncing on list object
     */
    syncProjectorList() {
      if(this.pendingListSync !== null) return;

      if(this.projOn && this.proj.mode === 'list')
        this.pendingListSync = setTimeout(() => {
          this.pendingListSync = null;
          this.sendToProjector({
            type: 'update',
            target: 'list',
            data: { list: this.proj.target },
          });
        }, 10);
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

    requestShowServer() {
      if(globalConn) this.showServerFlag = true;
    },

    copyServerSetting(key) {
      const v = key === 'idkey' ? this.backendIDKey : this.backendPasskey;
      clipboard.writeText(v);

      this.copied = key;
      if(this.copiedDiscarder !== null) clearInterval(this.copiedDiscarder);
      this.copiedDiscarder = setTimeout(() => {
        this.copiedDiscarder = null;
        this.copied = null;
      }, 500);
    },

    toggleProjector() {
      if(this.projOn) ipcRenderer.send('closeProjector');
      else ipcRenderer.send('openProjector');
    },

    clearProjector() {
      this.proj.mode = 'none';
      this.sendToProjector({ type: 'layer', target: null });
    },

    sendConfName() {
      this.sendToProjector({ type: 'update', target: 'title', data: { conf: connectedConf } });
    },

    setupProjector() {
      if(confConn) {
        this.sendToProjector({ type: 'update', target: 'status', data: { connected: true } });
        this.sendConfName();
        this.sendSeatCount();
      } else this.sendToProjector({ type: 'reset' });
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
    },
  },
};

// eslint-disable-next-line no-unused-vars
function setup() {
  const instance = new Vue(desc);

  setTimeout(() => {
    instance.init();
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
  });

  ipcRenderer.once('updateAvailable', (event, { detail, version }) => {
    Push.create(`软件更新: ${version}`, {
      body: '点击开始下载',
      timeout: 10000,
      onClick: () => {
        shell.openExternal(`https://store.bjmun.org/console-lite/${detail.name}`);
      },
    });
  });

  ipcRenderer.send('checkForUpdate');
}
