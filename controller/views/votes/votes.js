const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/votes.html`).toString('utf-8'),
  props: {
    votes: {},
    seats: {},
    authorized: {},
    searchInput: { default: '' },
  },

  data: () => ({
    addFlag: false,
    inputName: '',
    inputRounds: 1,
    inputTarget: 0,
    isSubstantive: true,
  }),

  methods: {
    add() {
      this.addFlag = true;
      this.inputName = '';
      this.inputRounds = 0;
      this.inputTarget = 0;
      this.isSubstantive = true;
    },

    discardAddition() {
      this.addFlag = false;
    },

    performAddition() {
      if(this.inputName.length === 0) return;

      this.$emit('add-vote',
        this.inputName,
        this.isSubstantive ? -1 : this.inputTarget,
        this.inputRounds,
        this.seats.filter(e => e.present).map(e => e.name));

      this.addFlag = false;
    },

    viewVote(vote) {
      this.$emit('view-vote', vote);
    },

    setToHalf() {
      this.inputTarget = Math.floor(this.presentCount / 2) + 1;
    },

    setToTwoThird() {
      this.inputTarget = Math.ceil(this.presentCount * 2 / 3);
    },

    countVotes(vote, target) {
      return vote.matrix.reduce((prev, e) => e.vote === target ? prev + 1 : prev, 0);
    },

    getFileTwoThird(vote) {
      return Math.ceil((vote.matrix.length - this.countVotes(vote, -1)) * 2 / 3);
    },
  },

  computed: {
    presentCount() {
      return this.seats.reduce((prev, e) => e.present ? prev + 1 : prev, 0);
    },

    filteredVotes() {
      if(this.searchInput) 
        return this.votes.filter(e => e.name.indexOf(this.searchInput) !== -1);
      return this.votes;
    },
  },
});

module.exports = VoteView;
