const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const Timer = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timer.html`).toString('utf-8'),
  props: ['time', 'fixHour', 'fixMinute'],
  computed: {
    hour() {
      return Math.floor(this.time / 3600);
    },

    minute() {
      return Math.floor(this.time / 60) % 60;
    },

    second() {
      return this.time % 60;
    },

    showHour() {
      return this.fixHour || this.hour > 0;
    },

    showMinute() {
      return this.showHour || this.fixMinute || this.minute > 0;
    },

    minuteStr() {
      if(this.minute >= 10 || !this.showHour) return this.minute;
      else return `0${this.minute}`;
    },

    secondStr() {
      if(this.second >= 10 || !this.showMinute) return this.second;
      else return `0${this.second}`;
    },
  },
});

module.exports = Vue.component('timer', Timer);
