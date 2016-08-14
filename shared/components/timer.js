const Vue = require('vue');
const fs = require('fs');

const Timer = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timer.html`).toString('utf-8'),
  props: ['time', 'fixHour', 'fixMinute'],
  computed: {
    hour: function() {
      return Math.floor(this.time / 3600);
    },

    minute: function() {
      return Math.floor(this.time / 60) % 60;
    },
    
    second: function() {
      return this.time % 60;
    },

    showHour: function() {
      return this.fixHour || this.hour > 0;
    },

    showMinute: function() {
      return this.showHour || this.fixMinute || this.minute > 0;
    },

    minuteStr: function() {
      if(this.minute >= 10 || !this.showHour) return this.minute;
      else return '0' + this.minute;
    },

    secondStr: function() {
      if(this.second >= 10 || !this.showMinute) return this.second;
      else return '0' + this.second;
    }
  }
});

Vue.component('timer', Timer);

module.exports = Timer;
