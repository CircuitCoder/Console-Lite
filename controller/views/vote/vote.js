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

    _overrideSetVote: false,

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
          if(res !== 0) return res;
        }

        return 0;
      });
    },

    start() {
      if(this.vote.status.running) return;

      if(this.vote.rounds > 0 && this.vote.status.iteration === this.vote.rounds)
        if(!confirm('按照预定轮数，投票已经结束，是否开始下一轮?')) return;

      this.$dispatch('iterate-vote', this.vote.id, {
        iteration: this.vote.status.iteration + 1,
        running: true
      });
    },

    stop() {
      if(!this.vote.status.running) return;

      if(this.vote.status.iteration === this.vote.rounds)
        if(this.vote.matrix.some(e => e.vote === 0))
          if(!confirm('这是最后一轮投票了，还有投票为过的席位，是否结束这轮投票?')) return;

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

      if(!this._overrideSetVote
        && this.targetVote === 0
        && this.vote.status.iteration === this.vote.rounds) {
          if(!confirm('这是最后一轮投票了，是否将投票结果设置为过?')) return;
          else this._overrideSetVote = true;
        }

      if(this.targetVote !== this.targetVoter.vote) // Changed
        this.$dispatch('update-vote', this.vote.id, this.targetVoter.originalId, this.targetVote);

      this.manipulateFlag = false;
    },

    cast() {
      this.$dispatch('project-vote', this.vote);
    },
  },

  computed: {
    positiveCount() {
      return this.vote.matrix.reduce((prev, e) => e.vote === 1 ? prev + 1 : prev, 0);
    },

    negativeCount() {
      return this.vote.matrix.reduce((prev, e) => e.vote === -2 ? prev + 1 : prev, 0);
    },

    abstainedCount() {
      return this.vote.matrix.reduce((prev, e) => e.vote === -1 ? prev + 1 : prev, 0);
    }
  }
});

module.exports = VoteView;
