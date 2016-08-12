const vue = require('vue');
const io = require('socket.io-client');
const {ipcRenderer} = require('electron');

const GlobalConnection = require('./connection/global');
const ConferenceConnection = require('./connection/conference');

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
  },

  methods: {
    init() {
      this.started = true;

      setTimeout(() => {
        this.ready = true;
      }, 1000);
    },

    connectBackend() {
      this.loading = true;
      setTimeout(() => {
        this.frame = true;
      }, 2000);
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

        socket = io(data.url, {
          extraHeaders: {
            'Console-Passkey': data.passkey
          }
        });

        globalConn = new GlobalConnection(socket, (data) => {
          this.confs = data.confs;
          this.authorized = data.authorized;
          this.picker = true;
        });
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

    seatsUpdated() {
      this.recalcCount();
    },

    recalcCount() {
      this.seatCount = this.seats.length;
      this.presentCount = this.seats.reduce((prev, e) => e.present ? prev+1 : prev, 0);
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
