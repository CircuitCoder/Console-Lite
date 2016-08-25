const Vue = require('vue');
const fs = require('fs');
const crypto = require('crypto');

const util = require('../../../shared/util.js');

const ListView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/list.html`).toString('utf-8'),
  props: [
    'list',
  ],

  data: () => ({
    acList: [],
    addFlag: false,
    editTarget: null,
    editInput: '',

    acIndex: 0,
    acInput: null
  }),

  methods: {
    updateAC() {
      this.acList = util.resolveAC(this.editInput);
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
      this.editInput = '';
      this.addFlag = true;
      this.$nextTick(() => {
        this.acInput = this.$els.addInput;
        this.$els.addInput.focus();
      });
      this.updateAC();
      this.editTarget = null;
    },

    edit(seat, index) {
      this.editInput = seat.name;
      this.editTarget = seat.uid;

      this.$nextTick(() => {
        const el = this.$els.seats.children[index].getElementsByTagName('input')[0];
        this.acInput = el;
        el.focus();
        el.select();
      });

      this.updateAC();

      this.addFlag = false;
    },

    discardAll(e) {
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

      this.$dispatch('update-list', this.list.id, seats);

      this.acList = [];
      this.addFlag = false;
    },

    performEdit() {
      if(!this.editTarget) return;

      const seats = [...this.list.seats];

      let foundFlag = false;

      for(let i = 0; i < seats.length; ++i)
        if(seats[i].uid === this.editTarget) {
          if(this.editInput === seats[i].name) break;

          foundFlag = true;

          if(this.editInput === '') {
            seats.splice(i, 1);
          } else {
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

      this.$dispatch('update-list', this.list.id, seats);
    },
  },

  computed: {
    indicatorTransform() {
      return `translateY(${this.acIndex * 41}px) scale(${this.acList.length > 0 ? 1 : 0})`;
    }
  },
});

module.exports = ListView;
