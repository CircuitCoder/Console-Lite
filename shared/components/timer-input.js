const Vue = require('vue');
const fs = require('fs');

const TimerInput = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timer-input.html`).toString('utf-8'),
  props: {
    time: {
      twoWay: true,
      type: Number,
      validator: val => Number.isInteger(val),
      required: true,
    },
  },

  computed: {
    second: {
      get() {
        return this.time % 60;
      },

      set(val) {
        if(!Number.isInteger(val)) val = Math.floor(val);
        if(val > 59) val = 59;
        else if(val < 0) val = 0;

        const min = Math.floor(this.time / 60);
        this.time = (min * 60) + val;
      },
    },

    minute: {
      get() {
        return Math.floor(this.time / 60) % 60;
      },

      set(val) {
        if(!Number.isInteger(val)) val = Math.floor(val);
        if(val > 59) val = 59;
        else if(val < 0) val = 0;

        const sec = this.time % 60;
        const hour = Math.floor(this.time / 3600);
        this.time = (hour * 3600) + (val * 60) + sec;
      },
    },

    hour: {
      get() {
        return Math.floor(this.time / 3600);
      },

      set(val) {
        if(!Number.isInteger(val)) val = Math.floor(val);
        if(val < 0) val = 0;

        const sec = this.time % 3600;
        this.time = (val * 3600) + sec;
      },
    },
  },
});

Vue.component('timer-input', TimerInput);

module.exports = TimerInput;
