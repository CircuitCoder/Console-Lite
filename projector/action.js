const Vue = require('vue');
const {ipcRenderer} = require('electron');

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
      }
    },

    setupLayer({ target, data }, immediate = false) {
      if(!immediate) {
        if(this.switching !== null) {
          clearInterval(this.switching);
          this.switching = null;
        }

        if(this.mode !== null) {
          // Wait for fade out
          // TODO: racing condition?
          this.switching = true;

          this.switching = setTimeout(() => {
            this.setupLayer({ target, data }, true);
            this.switching = null;
          }, 200);

          return;
        }
      }

      this.mode = target;
      if(target === 'timer') {
        if('name' in data) this.timerName = data.name;
        if('left' in data) this.timerLeft = data.left;
        if('value' in data) this.timerValue = data.value;
        if('active' in data) this.timerActive = data.active;
      }
    },

    resetLayer() {
      this.mode = null;
    }
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
