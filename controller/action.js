const vue = require('vue');
const io = require('socket.io-client');
const {ipcRenderer} = require('electron');

const GlobalConnection = require('./connection/global');
const ConferenceConnection = require('./connection/conference');

require('./components/timer');

let globalConn, confConn;
let serverConfig;

const desc = {
  el: 'body',
  data: {
    started: false,
    ready: false,
    loading: false,
    picker: false,
    frame: false,

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
  },

  components: {
    home: require('./views/home'),
    seats: require('./views/seats'),
    timers: require('./views/timers'),
  },

  methods: {
    init() {
      this.started = true;

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
          console.log(resp.error);
          confConn = null;
          alert('连接失败!');
          return;
        }
        console.log(this.timers);

        this.timers = data.timers;
        this.seats = data.seats;

        this.recalcCount();

        this.title = name;

        this.activeView = 'home';
        this.frame = true;
      });

      confConn.addListener({
        seatsUpdated: (seats) => {
          this.seats = seats;
          this.recalcCount();
        },

        timerAdded: (id, name, type, value) => {
          this.timers.unshift({ id, name, value, type, active: false });
        },
        
        timerStarted: (id, value) => this.executeOnTimer(id, timer => {
          timer.active = true;
          timer.left = value;
        }),

        timerStopped: (id, value) => this.executeOnTimer(id, timer => {
          timer.active = false;
        }),

        timerUpdated: (id, value) => this.executeOnTimer(id, timer => {
          timer.value = value;
          timer.left = value;
        }),

        timerTick: (id, value) => this.executeOnTimer(id, timer => {
          timer.left = value;
        }),
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

    navigate(dest) {
      this.activeView = dest;
    },

    /* Seats */

    updateSeats(seats) {
      // Sync up, recalculate will be completed on pingback event
      confConn.updateSeats(seats);
    },

    recalcCount() {
      this.seatCount = this.seats.length;
      this.presentCount = this.seats.reduce((prev, e) => e.present ? prev+1 : prev, 0);
    },

    /* Timers */

    addTimer(name, sec) {
      confConn.addTimer(name, 'plain', sec, (err, id) => {
        if(err) {
          console.log(error);
          alert('添加失败!');
        }
      });
    },

    manipulateTimer(action, id) {
      confConn.manipulateTimer(action, id, (err, id) => {
        if(err) {
          console.log(error);
          alert('操作失败!');
        }
      });
    },

    updateTimer(id, value) {
      confConn.updateTimer(id, value, (err, id) => {
        if(err) {
          console.log(error);
          alert('修改失败!');
        }
      });
    },

    executeOnTimer(id, cb) {
      for(const timer of this.timers)
        if(timer.id === id) {
          cb(timer);
          break;
        }
    },

    /* Utitlities */

    startProjector() {
    },
    
    blocker(event) {
      event.stopPropagation();
      event.preventDefault();
    }
  }
}

function setup() {
  const instance = new vue(desc);
  instance.init();
}
