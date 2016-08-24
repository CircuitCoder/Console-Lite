const Vue = require('vue');
const fs = require('fs');

const HomeView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/home.html`).toString('utf-8'),
  props: ['timers', 'votes'],

  methods: {
    navigateTo(dest) {
      this.$dispatch('navigate', dest);
    },

    activeList(list) {
      return list.timerCurrent && list.timerCurrent.active;
    },

    activeStandaloneTimer(timer) {
      return timer.type === 'standalone' && timer.active;
    },

    gotoTimer(name) {
      this.$dispatch('navigate', 'timers', { search: name });
    },

    activeVote(vote) {
      if(vote.rounds > 0 && vote.status.iteration > 0 && vote.status.iteration < vote.rounds)
        return true;

      return vote.status.running;
    },

    countVotes(vote, target) {
      return vote.matrix.reduce((prev, e) => e.vote === target ? prev + 1 : prev, 0);
    },

    viewVote(vote) {
      this.$dispatch('view-vote', vote);
    },
  }
})

module.exports = HomeView;
