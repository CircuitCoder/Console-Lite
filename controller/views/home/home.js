const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const HomeView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/home.html`).toString('utf-8'),
  props: ['timers', 'votes', 'lists', 'title'],

  methods: {
    navigateTo(dest) {
      this.$emit('navigate', dest);
    },

    activeList(list) {
      return (list.timerCurrent && list.timerCurrent.active) || list.ptr < list.seats.length;
    },

    viewList(list) {
      this.$emit('view-list', list);
    },

    activeStandaloneTimer(timer) {
      return timer.type === 'standalone' && timer.active;
    },

    gotoTimer(name) {
      this.$emit('navigate', 'timers', { search: name });
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
      this.$emit('view-vote', vote);
    },
  },

  computed: {
    filteredLists() {
      return this.lists.filter(e => this.activeList(e)).slice(0, 5);
    },

    filteredTimers() {
      return this.timers.filter(e => this.activeStandaloneTimer(e)).slice(0, 5);
    },

    filteredVotes() {
      return this.votes.filter(e => this.activeVote(e)).slice(0, 5);
    },
  },
});

module.exports = HomeView;
