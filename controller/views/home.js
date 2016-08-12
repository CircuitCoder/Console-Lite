const Vue = require('vue');
const fs = require('fs');

const HomeComponent = Vue.extend({
  template: fs.readFileSync(`${__dirname}/home.html`).toString('utf-8'),
  props: ['timers'],

  methods: {
    navigateTo(dest) {
      this.$dispatch('navigate', dest);
    },

    activeEntry(entry) {
      return entry.active;
    }
  }
})

module.exports = HomeComponent;
