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
  }),

  methods: {
    updateAC() {
    },

    add() {
      this.editInput = '';
      this.addFlag = true;
      this.$nextTick(() => {
        this.$els.addInput.focus();
      });
    },

    edit(seat, index) {
      this.editInput = seat.name;
      this.editTarget = seat.uid;

      this.$nextTick(() => this.$els.seats.children[index].getElementsByTagName('input')[0].focus());
    },

    discardAddition() {
      this.addFlag = false;
    },

    discardEdit() {
      this.editTarget = null;
    },

    performAddition() {
      if(this.editInput.length <= 0) return;
      const seats = [...this.list.seats];
      seats.push({
        name: this.editInput,
        uid: crypto.randomBytes(16).toString('hex'),
      });

      this.$dispatch('update-list', this.list.id, seats);

      this.addFlag = false;
    },

    performEdit() {
      if(this.editInput.length <= 0) return;
      if(!this.editTarget) return;

      const seats = [...this.list.seats];

      let foundFlag = false;

      for(let i = 0; i < seats.length; ++i)
        if(seats[i].uid === this.editTarget) {
          if(this.editInput === seats[i].name) return;

          foundFlag = true;
          const oriSeat = seats[i];
          seats[i] = {
            uid: oriSeat.uid,
            name: this.editInput,
          };

          break;
        }

      this.editTarget = null;

      if(!foundFlag) return;

      this.$dispatch('update-list', this.list.id, seats);
    },
  },
});

module.exports = ListView;
