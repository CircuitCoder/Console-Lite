const Vue = require('vue');
const fs = require('fs');

const TimersView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timers.html`).toString('utf-8'),
  props: ['timers'],
  data: () => ({
    addFlag: false,
    timerName: '',
    timerHour: 0,
    timerMinute: 0,
    timerSecond: 0,
  }),
  methods: {
    add() {
      this.timerName = '';
      this.timerHour = 0;
      this.timerMinute = 0;
      this.timerSecond = 0;
      this.addFlag = true;
    },

    discardAddition() {
      this.addFlag = false;
    },

    performAddition() {
      const sec = ( this.timerHour * 60 + this.timerMinute ) * 60 + this.timerSecond;
      if(this.timerName === '' || sec <= 0) return;
      this.$dispatch('add-timer', this.timerName, sec);
      this.addFlag = false;
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
    
    toggleTimer(timer) {
      console.log(timer);
      timer.active = !timer.active;
    },

    blocker(event) {
      event.stopPropagation();
      event.preventDefault();
    },
  }
});

module.exports = TimersView;
