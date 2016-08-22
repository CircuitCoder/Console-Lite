const Vue = require('vue');
const {ipcRenderer} = require('electron');

const util = require('../shared/util.js');

require('../shared/components/timer.js');

const desc = {
  el: 'body',
  data: {
    ready: false,
    switching: false,
    mode: null,

    connected: false,
    conf: '',

    seat: 0,
    present: 0,

    timerName: '',
    timerLeft: 0,
    timerValue: 0,
    timerActive: false,

    fileName: '',
    fileType: 'download',
    fileMIME: '',
    fileCont: null,
  },
  methods: {
    init() {
      this.ready = true;

      ipcRenderer.on('fromController', (event, data) => {
        console.log(data);
        if(data.type === 'update') this.performUpdate(data);
        else if(data.type === 'reset') this.resetLayer();
        else this.setupLayer(data);
      });

      ipcRenderer.send('projectorInitialized');
    },

    performUpdate({ target, data }) {
      if(target === 'status') {
        this.connected = data.connected;
      } else if(target === 'seats') {
        this.seat = data.seat;
        this.present = data.present;
      } else if(target === 'title') {
        this.conf = data.conf;
      } else if(target === 'timer') {
        if('name' in data) this.timerName = data.name;
        if('left' in data) this.timerLeft = data.left;
        if('value' in data) this.timerValue = data.value;
        if('active' in data) this.timerActive = data.active;
      } else if(target === 'file') {
        // Update scrolltop
        if('scrollPos' in data) {
        }
      }
    },

    setupLayer({ target, data }) {
      if(this.switching) {
        clearInterval(this.switching);
      }

      this.switching = setTimeout(() => {
        this._setupLayer(target, data).then(() => {
          this.switching = null;
        });
      }, 200);
    },

    _setupLayer(target, data) {
      this.mode = target;

      if(target === 'timer') {
        if('name' in data) this.timerName = data.name;
        if('left' in data) this.timerLeft = data.left;
        if('value' in data) this.timerValue = data.value;
        if('active' in data) this.timerActive = data.active;
      } else if(target === 'file') {
        this.fileName = data.meta.name;
        this.fileCont = data.content;
        this.fileMIME = data.meta.type;
        this.fileType = util.getFileType(data.meta.type);

        if(this.fileType === 'pdf') {
          this.clearPages();
          return util.renderPDF(this.fileCont, -1, this.$els.pages, window.innerWidth * 0.8);
        } else if(this.fileType === 'image') {
        }
      }

      return Promise.resolve();
    },

    resetLayer() {
      this.connected = false;
      this.setupLayer({ target: null });
    },

    clearPages() {
      while(this.$els.pages.firstChild)
        this.$els.pages.removeChild(this.$els.pages.firstChild);
      this.$els.pages.scrollTop = 0;
    },
  },

  computed: {
    simpleHalfCount() {
      return Math.floor(this.present / 2) + 1;
    },

    twoThirdCount() {
      return Math.ceil(this.present * 2 / 3);
    },

    twentyPercentCount() {
      return Math.ceil(this.present / 5);
    },

    timerProgressOffset() {
      if(this.timerValue === 0) return 'translateX(-0)';
      else return `translateX(-${100 - 100 * this.timerLeft/this.timerValue}%)`;
    },

    shortName() {
      return this.fileName.split('.')[0];
    },

    imgRendered() {
      const b64str = btoa(String.fromCharCode(...new Uint8Array(this.fileCont)));
      return `data:${this.fileMIME};base64,${b64str}`;
    },
  }
};

function setup() {
  const instance = new Vue(desc);
  instance.init();
}
