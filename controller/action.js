const vue = require('vue');
const io = require('socket.io-client');
const {ipcRenderer} = require('electron');

const GlobalConnection = require('./connection/global');

let globalConn;

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

    title: '主页',

    authorized: false,
    confs: {},
    confNames: [],
  },

  methods: {
    init() {
      this.started = true;
      console.log("INIT");

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

        socket = io(data.url, {
          extraHeaders: {
            'Console-Passkey': data.passkey
          }
        });

        globalConn = new GlobalConnection(socket, (data) => {
          console.log(data);
          this.confs = data.confs;

          for(const conf in this.confs) {
            console.log(conf);
            this.confNames.push({ id: conf, name: this.confs[conf] });
          }

          this.authorized = data.authorized;
          this.picker = true;
        });
      });

      ipcRenderer.send('startServer');

      this.loading = true;
    },

    connectConf(id) {
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
          this.confs[data.id] = data.name;
          this.confNames.push({ id: data.id, name: data.name });
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
