const Vue = require('vue');
const fs = require('fs');

const HomeView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/home.html`).toString('utf-8'),
  props: ['timers'],

  methods: {
    navigateTo(dest) {
      this.$dispatch('navigate', dest);
    },

    activeEntry(entry) {
      return entry.active;
    },

    gotoTimer(name) {
      this.$dispatch('navigate', 'timers', { search: name });
    },
  }
})

module.exports = HomeView;
