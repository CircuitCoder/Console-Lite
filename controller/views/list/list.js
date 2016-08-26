const Vue = require('vue');
const fs = require('fs');
const crypto = require('crypto');

const util = require('../../../shared/util.js');

const ListView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/list.html`).toString('utf-8'),
  props: [
    'list',
    'altHold',
    'authorized',
  ],

  data: () => ({
    acList: [],
    addFlag: false,
    editTarget: null,
    editInput: '',

    acIndex: 0,
    acInput: null,
    acBottomGap: 0,

    dragList: null,

    overlap: null,
    dragging: null,
    dragMode: false,
    dragModeDiscarder: null,
    draggingIndex: -1,
    draggingOriginal: -1,
    draggingCounter: 0,

    editTimerFlag: false,
    totTime: 0,
    eachTime: 0,

    _overrideAdd: false,
    _overrideStart: false,
  }),

  methods: {
    updateAC() {
      this.acList = util.resolveAC(this.editInput).splice(0, 5);
      if(this.acList.length === 0) this.acIndex = 0;
      else if(this.acIndex >= this.acList.length) this.acIndex = this.acList.length - 1;
    },

    performAC(text = null) {
      if(text) this.editInput = text;
      else this.editInput = this.acList[this.acIndex];
      this.updateAC();
      this.acInput.focus();
    },

    moveACUp() {
      if(this.acIndex !== 0) --this.acIndex;
    },

    moveACDown() {
      if(this.acIndex !== this.acList.length - 1) ++this.acIndex;
    },

    add() {
      if(!this._overrideAdd)
        if(this.list.timerTotal && this.list.timerTotal.value > 0)
          if(this.list.timerCurrent) {
            const afterThisGuy = this.list.timerTotal.left - this.list.timerCurrent.left;
            const afterAllGuys = afterThisGuy
              - (this.list.timerCurrent.value * (this.list.seats.length - this.list.ptr - 1));

            if(afterAllGuys < this.list.timerCurrent.value) {
              if(!confirm('剩余总时间无法容纳添加的代表，是否继续?')) return;
              this._overrideAdd = true;
            }
          }

      this.editInput = '';
      this.addFlag = true;
      this.$nextTick(() => {
        this.acBottomGap = this.$els.seats.offsetHeight
          - (this.$els.addItem.offsetTop + this.$els.addItem.offsetHeight);

        this.acInput = this.$els.addInput;
        this.$els.addInput.focus();
      });
      this.updateAC();
      this.editTarget = null;
    },

    edit(seat, index) {
      if(!this.authorized) return;

      this.editInput = seat.name;
      this.editTarget = seat.uid;

      const wrapper = this.$els.seats.children[index + 1];
      this.acBottomGap = this.$els.seats.offsetHeight - (wrapper.offsetTop + wrapper.offsetHeight);

      this.$nextTick(() => {
        const el = this.$els.seats.children[index + 1].getElementsByTagName('input')[0];
        this.acInput = el;
        el.focus();
        el.select();
      });

      this.updateAC();

      this.addFlag = false;
    },

    discardAll() {
      this.addFlag = false;
      this.editTarget = null;
      this.acList = [];
    },

    performAddition() {
      if(this.editInput.length <= 0) return;
      const seats = [...this.list.seats];
      seats.push({
        name: this.editInput,
        uid: crypto.randomBytes(16).toString('hex'),
      });

      this.$dispatch('update-list', this.list, seats);

      this.acList = [];
      this.addFlag = false;

      if(this.altHold)
        this.$nextTick(() => this.add());
    },

    performEdit() {
      if(!this.editTarget) return;

      const seats = [...this.list.seats];

      let foundFlag = false;

      for(let i = 0; i < seats.length; ++i)
        if(seats[i].uid === this.editTarget) {
          if(this.editInput === seats[i].name) break;

          foundFlag = true;

          if(this.editInput === '')
            seats.splice(i, 1);
          else {
            const oriSeat = seats[i];
            seats[i] = {
              uid: oriSeat.uid,
              name: this.editInput,
            };
          }

          break;
        }

      this.acList = [];
      this.editTarget = null;

      if(!foundFlag) return;

      this.$dispatch('update-list', this.list, seats);
    },

    /* Dragging */
    dragstart(seat, index, e) {
      e.dataTransfer.setData('text/plain', null);
      this.overlap = seat;
      this.dragging = seat;
      this.draggingIndex = index;
      this.draggingOriginal = index;
      this.draggingCounter = 0;

      if(this.dragModeDiscarder !== null)
        clearInterval(this.dragModeDiscarder);

      this.dragModeDiscarder = null;
      this.dragMode = true;

      this.dragList = [...this.list.seats];
    },

    drag(e) {
      let curMin = Infinity;
      let curIndex = -1;

      if(this.draggingCounter > 0)
        for(let i = 0; i < this.dragList.length; ++i) {
          const elem = this.$els.seats.children[i + 1];
          const centerX = elem.offsetLeft + (elem.offsetWidth / 2);
          const centerY = elem.offsetTop + (elem.offsetHeight / 2);

          // Manhattan distance
          const dist = Math.abs(e.clientX - centerX) + Math.abs(e.clientY - centerY);
          if(dist < curMin) {
            curMin = dist;
            curIndex = i;
          }
        }
      else curIndex = this.draggingOriginal;

      if(curIndex !== -1 && curIndex !== this.draggingIndex) {
        const tmp = this.dragList[this.draggingIndex];
        this.dragList.$set(this.draggingIndex, this.dragList[curIndex]);
        this.dragList.$set(curIndex, tmp);

        this.draggingIndex = curIndex;
      }
    },

    dragend() {
      this.dragging = null;

      this.dragModeDiscarder = setTimeout(() => {
        this.dragModeDiscarder = null;
        this.dragMode = false;
      }, 200);
    },

    dragenter() {
      ++this.draggingCounter;
    },

    dragleave() {
      --this.draggingCounter;
    },

    drop() {
      this.$dispatch('update-list', this.list, this.dragList);
    },

    start() {
      if(!this._overrideStart)
        if(this.list.timerTotal && this.list.timerTotal.value > 0)
          if(this.list.timerCurrent)
            if(this.list.timerCurrent.left > this.list.timerTotal.left) {
              if(!confirm('剩余时间已不足此名代表发言, 是否继续?')) return;

              this._overrideStart = true;
            }

      this.$dispatch('start-list', this.list);
    },

    stop() {
      this.$dispatch('stop-list', this.list);
    },

    next() {
      if(this.list.ptr >= this.list.seats.length) return;
      this.$dispatch('iterate-list', this.list, this.list.ptr + 1);
    },

    editTimer() {
      this.editTimerFlag = true;
      this.eachTime = 0;
      this.totTime = 0;

      if(this.list.timerCurrent)
        this.eachTime = this.list.timerCurrent.value;

      if(this.list.timerTotal)
        this.totTime = this.list.timerTotal.left;
    },

    performTimerEdit() {
      if(this.eachTime === 0) return;
      if(!this.list.timerCurrent || this.eachTime !== this.list.timerCurrent.value)
        this.$dispatch('update-list-current', this.list, this.eachTime);

      if(!this.list.timerTotal || this.totTime !== this.list.timerTotal.value)
        this.$dispatch('update-list-total', this.list, this.totTime);

      this.editTimerFlag = false;
    },

    project() {
      this.$dispatch('project-list', this.list);
    },
  },

  computed: {
    indicatorTransform() {
      return `translateY(${this.acIndex * 40}px) scale(${this.acList.length > 0 ? 1 : 0})`;
    },

    attachOnTop() {
      return this.acBottomGap < 200;
    },
  },
});

module.exports = ListView;
