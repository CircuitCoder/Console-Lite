const Vue = require('vue');
const VueAnimatedList = require('vue-animated-list');
Vue.use(VueAnimatedList);

const {ipcRenderer} = require('electron');
const BezierEasing = require('bezier-easing');

const util = require('../shared/util.js');

require('../shared/components/timer.js');

const desc = {
  el: 'body',
  data: {
    ready: false,
    switching: false,
    mode: null,

    connected: false,
    conf: '',

    seat: 0,
    present: 0,

    timerName: '',
    timerLeft: 0,
    timerValue: 0,
    timerActive: false,

    fileName: '',
    fileType: 'download',
    fileMIME: '',
    fileCont: null,

    vote: null,
    voteMat: [],

    list: null,
    stashedlist: null,
  },
  methods: {
    init() {
      this.ready = true;

      ipcRenderer.on('fromController', (event, data) => {
        console.log(data);
        if(data.type === 'update') this.performUpdate(data);
        else if(data.type === 'reset') this.resetLayer();
        else this.setupLayer(data);
      });

      ipcRenderer.send('projectorInitialized');
    },

    _scrollSmooth(el, to) {
      current = el.scrollLeft;
      scrollCount = 0,
      startTime = performance.now();
      easing = BezierEasing(0.25, 0.1, 0.25, 1.0);

      function step(now) {
        if(now - startTime < 200) {
          const ratio = easing((now - startTime) / 200);
          el.scrollLeft = current + (to - current) * ratio;
          window.requestAnimationFrame(step);
        } else {
          el.scrollLeft = to;
        }
      }

      window.requestAnimationFrame(step);
    },

    _recenterList() {
      let i = this.list.ptr;
      if(i >= this.list.length) i = this.list.seats.length - 1;

      const vw = window.innerWidth;
      let left = this.$els.speakers.children[i].offsetLeft - 0.3 * vw;
      if(left + this.$els.speakers.offsetWidth > this.$els.speakers.scrollWidth)
        left = this.$els.speakers.scrollWidth - this.$els.speakers.offsetWidth;
      if(left < 0) left = 0;

      this._scrollSmooth(this.$els.speakers, left);
    },

    performUpdate({ target, data }) {
      if(target === 'status') {
        this.connected = data.connected;
      } else if(target === 'seats') {
        this.seat = data.seat;
        this.present = data.present;
      } else if(target === 'title') {
        this.conf = data.conf;
      } else if(target === 'timer') {
        if('name' in data) this.timerName = data.name;
        if('left' in data) this.timerLeft = data.left;
        if('value' in data) this.timerValue = data.value;
        if('active' in data) this.timerActive = data.active;
      } else if(target === 'file') {
        // Update scrolltop
        if('scrollPos' in data) {
        }
      } else if(target === 'vote') {
        if(data.event === 'iterate') {
          this.vote.status = data.status;
          this._scrollSmooth(this.$els.voters, 0);

        } else { // update
          this.vote.matrix[data.index].vote = data.vote;

          if(!data.rearrange) { // Running vote
            let i = 0;
            for(; i<this.voteMat.length; ++i) if(this.voteMat[i] === this.vote.matrix[data.index]) break;
            if(i !== this.voteMat.length) {
              const vw = window.innerWidth;
              let left = this.$els.voters.children[i].offsetLeft - 0.3 * vw;
              if(left + this.$els.voters.offsetWidth > this.$els.voters.scrollWidth)
                left = this.$els.voters.scrollWidth - this.$els.voters.offsetWidth;
              if(left < 0) left = 0;

              this._scrollSmooth(this.$els.voters, left);
            }
          }
        }

        if(data.rearrange)
          setTimeout(() => {
            util.sortVoteMatrix(this.voteMat);
          }, 100);
      } else if(target === 'list') {
        if(this.switching) this.stashedlist = data.list;
        else {
          this.list = data.list;
          if(this.mode === 'list') this.$nextTick(() => this._recenterList());
        }
      }
    },

    setupLayer({ target, data }) {
      if(target === 'list') this.stashedList = data.list;

      if(this.switching !== null) {
        clearInterval(this.switching);
      }

      this.switching = setTimeout(() => {
        this._setupLayer(target, data).then(() => {
          this.switching = null;
        });
      }, 200);
    },

    _setupLayer(target, data) {
      this.mode = target;

      if(target === 'timer') {
        if('name' in data) this.timerName = data.name;
        if('left' in data) this.timerLeft = data.left;
        if('value' in data) this.timerValue = data.value;
        if('active' in data) this.timerActive = data.active;
      } else if(target === 'file') {
        this.fileName = data.meta.name;
        this.fileCont = data.content;
        this.fileMIME = data.meta.type;
        this.fileType = util.getFileType(data.meta.type);

        if(this.fileType === 'pdf') {
          this.clearPages();
          return util.renderPDF(this.fileCont, -1, this.$els.pages, window.innerWidth * 0.8);
        } else if(this.fileType === 'image') { }
      } else if(target === 'vote') {
        this.vote = data.vote;

        // Setup mat
        this.voteMat = [...this.vote.matrix];

        // Sort anyway
        util.sortVoteMatrix(this.voteMat);
      } else if(target === 'list') {
        // Using stashed list
        this.list = this.stashedList;
        this.$nextTick(() => this._recenterList());
      }

      return Promise.resolve();
    },

    resetLayer() {
      this.connected = false;
      this.setupLayer({ target: null });
    },

    clearPages() {
      while(this.$els.pages.firstChild)
        this.$els.pages.removeChild(this.$els.pages.firstChild);
      this.$els.pages.scrollTop = 0;
    },

    voteCount(status) {
      return this.vote ? this.vote.matrix.reduce((prev, e) => e.vote === status ? prev + 1 : prev, 0) : 0;
    }
  },

  computed: {
    simpleHalfCount() {
      return Math.floor(this.present / 2) + 1;
    },

    twoThirdCount() {
      return Math.ceil(this.present * 2 / 3);
    },

    twentyPercentCount() {
      return Math.ceil(this.present / 5);
    },

    timerProgressOffset() {
      if(this.timerValue === 0) return 'translateX(-0)';
      else return `translateX(-${100 - 100 * this.timerLeft/this.timerValue}%)`;
    },

    shortName() {
      return this.fileName.split('.')[0];
    },

    imgRendered() {
      const b64str = btoa(String.fromCharCode(...new Uint8Array(this.fileCont)));
      return `data:${this.fileMIME};base64,${b64str}`;
    },

    fileTwoThird() {
      if(!this.vote) return 0;
      else return Math.ceil((this.vote.matrix.length - this.voteCount(-1)) * 2 / 3);
    },

    abstainedCount() {
      return this.voteCount(-1);
    },

    positiveCount() {
      return this.voteCount(1);
    },

    negativeCount() {
      return this.voteCount(-2);
    },

    abstainedProgressOffset() {
      return `translateX(${100 - 100 * this.abstainedCount / this.vote.matrix.length}%)`;
    },

    negativeProgressOffset() {
      return `translateX(${100 - 100 * ( this.negativeCount + this.abstainedCount ) / this.vote.matrix.length}%)`;
    },

    positiveProgressOffset() {
      return `translateX(-${100 - 100 * this.positiveCount / this.vote.matrix.length}%)`;
    },

    targetOffset() {
      const _target = this.vote.target > 0 ? this.vote.target : this.fileTwoThird;
      return `translateX(${50 * _target / this.vote.matrix.length}vw)`;
    }
  }
};

function setup() {
  const instance = new Vue(desc);
  instance.init();
}
