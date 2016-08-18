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

    seat: 0,
    present: 0,

    timerName: '',
    timerLeft: 0,
    timerValue: 0,
    timerActive: false,

    fileName: '',
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
    },

    performUpdate({ target, data }) {
      if(target === 'seats') {
        this.seat = data.seat;
        this.present = data.present;
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

        this.clearPages();

        return util.renderPDF(this.fileCont, -1, this.$els.pages, window.innerWidth * 0.8);
      }

      return Promise.resolve();
    },

    resetLayer() {
      this.mode = null;
    },

    clearPages() {
      while(this.$els.pages.firstChild)
        this.$els.pages.removeChild(this.$els.pages.firstChild);
      this.$els.pages.scrollTop = 0;
    },
  },

  computed: {
    timerProgressOffset() {
      if(this.timerValue === 0) return 'translateX(-0)';
      else return `translateX(-${100 - 100 * this.timerLeft/this.timerValue}%)`;
    }
  }
};

function setup() {
  const instance = new Vue(desc);
  instance.init();
}
