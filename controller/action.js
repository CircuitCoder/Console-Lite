const vue = require('vue');

const desc = {
  el: 'body',
  data: {
    started: false,
    ready: false,
    loading: false,
    frame: false,

    title: '主页',
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
      console.log('connect');
      this.loading = true;
      setTimeout(() => {
        this.frame = true;
      }, 2000);
    },

    createBackend() {
      console.log('create');
      this.loading = true;
      setTimeout(() => {
        this.frame = true;
      }, 2000);
    },

    startProjector() {
    }
  }
}

function setup() {
  const instance = new vue(desc);
  instance.init();
}
