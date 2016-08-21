const Vue = require('vue');
const fs = require('fs');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/votes.html`).toString('utf-8'),
  props: [
    'votes',
    'seats',
    {
      name: 'searchInput',
      default: '',
    },
  ],

  data: () => ({
    addFlag: false,
    inputName: '',
    inputRounds: 1,
    inputTarget: 0,
  }),

  methods: {
    add() {
      this.addFlag = true;
      this.inputName = '';
      this.inputRounds = 0;
      this.inputTarget = 0;
    },

    discardAddition() {
      this.addFlag = false;
    },

    performAddition() {
      if(this.inputName.length === 0) return;

      this.$dispatch('add-vote', this.inputName, this.inputTarget, this.inputRounds, this.seats.filter(e => e.present).map(e => e.name));
      this.addFlag = false;
    },

    viewVote(vote) {
      this.$dispatch('view-vote', vote);
    },

    setToHalf() {
      this.inputTarget = Math.ceil((this.presentCount + 1) / 2);
    },

    setToTwoThird() {
      this.inputTarget = Math.ceil(this.presentCount * 2 / 3);
    },

    countVotes(vote, target) {
      return vote.matrix.reduce((prev, e) => e.vote === target ? prev + 1 : prev, 0);
    }
  },

  computed: {
    presentCount() {
      return this.seats.reduce((prev, e) => e.present ? prev + 1 : prev, 0);
    }
  },
});

module.exports = VoteView;
