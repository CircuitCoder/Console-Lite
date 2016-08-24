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
    timerValue: 0,
    timerId: 0,
    additionMode: false,
  }),
  methods: {
    add() {
      this.timerName = '';
      this.timerValue = 0;
      this.editFlag = true;
      this.additionMode = true;
    },

    edit(timer) {
      if(timer.active) return;

      this.timerId = timer.id;
      this.timerName = timer.name;
      this.timerValue = timer.value;

      this.additionMode = false;
      this.editFlag = true;
    },

    discardEdit() {
      this.editFlag = false;
    },

    performEdit() {
      if(this.timerName === '' || this.timerValue <= 0) return;
      if(this.additionMode) this.$dispatch('add-timer', this.timerName, this.timerValue);
      else this.$dispatch('update-timer', this.timerId, this.timerValue);
      this.editFlag = false;
    },

    toggle(timer) {
      if(timer.active) this.$dispatch('manipulate-timer', 'stop', timer.id);
      else if(timer.left === 0) this.$dispatch('manipulate-timer', 'restart', timer.id);
      else this.$dispatch('manipulate-timer', 'start', timer.id);
    },

    project(timer) {
      this.$dispatch('project-timer', timer)
    },

    isStandaloneTimer(timer) {
      return timer.type === 'standalone';
    }
  }
});

module.exports = TimersView;
