const Vue = require('vue');
const fs = require('fs');
const crypto = require('crypto');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/vote.html`).toString('utf-8'),
  props: [
    'vote',
  ],

  data: () => ({
    mat: [],
    manipulateFlag: false,
    targetVoter: { },
    targetVote: 0,

    VOTE_ROWS: [
      { code: 0, text: '过 / 未投票' },
      { code: 1, text: '赞成' },
      { code: -1, text: '弃权' },
      { code: -2, text: '反对' },
    ],
  }),

  activate(done) {
    // Generate id for voters
    
    this.mat = [...this.vote.matrix];

    this.vote.matrix.forEach((e, i) => {
      e.originalId = i;
    });

    if(!this.vote.status.running) {
      this.rearrange();
    }

    this.$on('vote-rearrange', () => {
      this.rearrange();
    });

    done();
  },

  methods: {
    /* Sort the matrix based on the following criterias:
     * - Passed -> Positive -> Negative -> Abstained
     * - Sort based on the original iteration in each category
     */

    _cateCmp(a, b, vote) {
      if(a.vote === vote) {
        if(b.vote === vote)
          return a.originalId < b.originalId ? -1 : 1;
        else return -1;
      } else if(b.vote === vote) return 1;

      return 0;
    },

    rearrange() {
      this.mat.sort((a, b) => {
        for(const v of [0, 1, -1, -2]) {
          const res = this._cateCmp(a, b, v);
          console.log(res);
          if(res !== 0) return res;
        }

        return 0;
      });

      console.log(this.mat.map(e => e.vote));
    },

    start() {
      if(this.vote.status.running) return;

      this.$dispatch('iterate-vote', this.vote.id, {
        iteration: this.vote.status.iteration + 1,
        running: true
      });
    },

    stop() {
      if(!this.vote.status.running) return;

      this.$dispatch('iterate-vote', this.vote.id, {
        iteration: this.vote.status.iteration,
        running: false,
      });
    },

    manipulate(voter) {
      this.targetVoter = voter;
      this.targetVote = voter.vote;
      this.manipulateFlag = true;
    },

    discardManipulation() {
      this.manipulateFlag = false;
    },

    performManipulation() {
      if(this.targetVote === this.targetVoter.vote) return; // Unchanged

      this.$dispatch('update-vote', this.vote.id, this.targetVoter.originalId, this.targetVote);
      this.manipulateFlag = false;
    },

    cast() {
      this.$dispatch('project-vote', this.vote);
    }
  },
});

module.exports = VoteView;
