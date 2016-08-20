const Vue = require('vue');
const fs = require('fs');

const TimersView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timers.html`).toString('utf-8'),
  props: [
    'timers',
    {
      name: 'searchInput',
      default: '',
    },
  ],
  data: () => ({
    editFlag: false,
    timerName: '',
    timerHour: 0,
    timerMinute: 0,
    timerSecond: 0,
    timerId: 0,
    additionMode: false,
  }),
  methods: {
    add() {
      this.timerName = '';
      this.timerHour = 0;
      this.timerMinute = 0;
      this.timerSecond = 0;
      this.editFlag = true;
      this.additionMode = true;
    },

    edit(timer) {
      if(timer.active) return;

      this.timerId = timer.id;
      this.timerName = timer.name;
      this.timerHour = Math.floor( timer.value / 3600 );
      this.timerMinute = Math.floor( timer.value / 60 ) % 60;
      this.timerSecond = timer.value % 60;

      this.additionMode = false;
      this.editFlag = true;
    },

    discardEdit() {
      this.editFlag = false;
    },

    performEdit() {
      const sec = ( this.timerHour * 60 + this.timerMinute ) * 60 + this.timerSecond;
      if(this.timerName === '' || sec <= 0) return;
      if(this.additionMode) this.$dispatch('add-timer', this.timerName, sec);
      else this.$dispatch('update-timer', this.timerId, sec);
      this.editFlag = false;
    },

    validate(target) {
      if(target === 'hour') {
        if(!Number.isInteger(this.timerHour)) this.timerHour = 0;
        else if(this.timerHour < 0) this.timerHour = 0;
      } else if(target === 'minute') {
        if(!Number.isInteger(this.timerMinute)) this.timerMinute = 0;
        else if(this.timerMinute < 0) this.timerMinute = 0;
        else if(this.timerMinute > 59) this.timerMinute = 59;
      } else if(target === 'second') {
        if(!Number.isInteger(this.timerSecond)) this.timerSecond = 0;
        else if(this.timerSecond < 0) this.timerSecond = 0;
        else if(this.timerSecond > 59) this.timerSecond = 59;
      }
    },
    
    toggle(timer) {
      if(timer.active) this.$dispatch('manipulate-timer', 'stop', timer.id);
      else if(timer.left === 0) this.$dispatch('manipulate-timer', 'restart', timer.id);
      else this.$dispatch('manipulate-timer', 'start', timer.id);
    },

    project(timer) {
      this.$dispatch('project-timer', timer)
    },
  }
});

module.exports = TimersView;
