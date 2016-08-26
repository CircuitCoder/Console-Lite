const Vue = require('vue');
const fs = require('fs');

const util = require('../../../shared/util.js');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/vote.html`).toString('utf-8'),
  props: [
    'vote',
    'altHold',
  ],

  data: () => ({
    mat: [],
    manipulateFlag: false,
    targetVoter: { },
    targetVote: 0,

    autoMode: false,
    autoIndex: 0,

    _overrideSetVote: false,

    VOTE_ROWS: [
      { code: 0, text: '过 / 未投票' },
      { code: 1, text: '赞成' },
      { code: -2, text: '反对' },
      { code: -1, text: '弃权' },
    ],
  }),

  activate(done) {
    // Generate id for voters

    this.mat = [...this.vote.matrix];

    this.vote.matrix.forEach((e, i) => {
      e.originalId = i;
    });

    if(!this.vote.status.running)
      this.rearrange();

    this.$on('vote-rearrange', () => {
      setTimeout(() => {
        this.rearrange();
      }, 100);
    });

    done();
  },

  methods: {

    rearrange() {
      util.sortVoteMatrix(this.mat);
    },

    start() {
      if(this.vote.status.running) return false;

      if(this.vote.rounds > 0 && this.vote.status.iteration === this.vote.rounds)
        if(!confirm('按照预定轮数，投票已经结束，是否开始下一轮?')) return false;

      if(this.emptyCount === 0)
        if(!confirm('现在所有席位都已经完成投票，是否开始下一轮?')) return false;

      this.$dispatch('iterate-vote', this.vote.id, {
        iteration: this.vote.status.iteration + 1,
        running: true,
      });

      return true;
    },

    autoStart() {
      if(!this.start()) return false;
      this.autoIndex = -1;
      this.autoMode = true;
      this.autoManipulate(0);
      return true;
    },

    autoManipulate(i) {
      if(i === this.mat.length) {
        /*
         * Because in the auto mode
         * The user must have be warned about a empty value at these round
         * Additionally, we have to wait for the broadcast event from the server
         * which is hard to implement,
         * So we use a force stop here
         */

        this.stop(true);
        this.manipulateFlag = false;
        this.autoMode = false;
      } else if(this.mat[i].vote !== 0)
        this.autoManipulate(i + 1);
      else {
        this.autoIndex = i;
        this.manipulate(this.mat[i]);
      }
    },

    stop(force = false) {
      if(!this.vote.status.running) return false;

      if(!force && this.vote.status.iteration === this.vote.rounds)
        if(this.vote.matrix.some(e => e.vote === 0))
          if(!confirm('这是最后一轮投票了，还有投票为过的席位，是否结束这轮投票?')) return false;

      this.$dispatch('iterate-vote', this.vote.id, {
        iteration: this.vote.status.iteration,
        running: false,
      });

      return true;
    },

    manipulate(voter) {
      this.targetVoter = voter;
      this.targetVote = voter.vote;
      this.manipulateFlag = true;
    },

    discardManipulation() {
      if(this.autoMode) {
        if(!confirm('确认退出自动模式?')) return;
        this.autoMode = false;
      }

      this.manipulateFlag = false;
    },

    performManipulation() {
      if(!this._overrideSetVote
        && this.targetVote === 0
        && this.vote.running
        && this.vote.status.iteration === this.vote.rounds)

        if(!confirm('这是最后一轮投票了，是否将投票结果设置为过?')) return;
        else this._overrideSetVote = true;

      if(this.targetVote !== this.targetVoter.vote) // Changed
        this.$dispatch('update-vote', this.vote.id, this.targetVoter.originalId, this.targetVote);

      if(this.autoMode)
        this.autoManipulate(this.autoIndex + 1);
      else
        this.manipulateFlag = false;
    },

    project() {
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
    },

    fileTwoThird() {
      return Math.ceil((this.vote.matrix.length - this.abstainedCount) * 2 / 3);
    },

    emptyCount() {
      return this.vote.matrix.reduce((prev, e) => e.vote === 0 ? prev + 1 : prev, 0);
    },
  },
});

module.exports = VoteView;
