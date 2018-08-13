const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const TimersView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timers.html`).toString('utf-8'),
  props: {
    timers: {},
    authorized: {},
    searchInput: { default: '' },
  },
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
      if(this.additionMode) this.$emit('add-timer', this.timerName, this.timerValue);
      else this.$emit('update-timer', this.timerId, this.timerValue);
      this.editFlag = false;
    },

    toggle(timer) {
      if(timer.active) this.$emit('manipulate-timer', 'stop', timer.id);
      else if(timer.left === 0) this.$emit('manipulate-timer', 'restart', timer.id);
      else this.$emit('manipulate-timer', 'start', timer.id);
    },

    project(timer) {
      this.$emit('project-timer', timer);
    },

    isStandaloneTimer(timer) {
      return timer.type === 'standalone';
    },
  },

  computed: {
    filteredTimers() {
      const timers = this.timers.filter(e => this.isStandaloneTimer(e));

      if(this.searchInput) return timers.filter(e => e.indexOf(this.searchInput) !== -1);
      return timers;
    },
  },
});

module.exports = TimersView;
