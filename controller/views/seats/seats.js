const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');
const pinyin = require('pinyin');

const SeatsView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/seats.html`).toString('utf-8'),
  props: ['seats', 'authorized'],

  data() {
    return {
      editFlag: false,
    };
  },

  methods: {
    edit() {
      this.editFlag = true;
      this.$refs.seatsInput.innerHTML = this.seats ? this.seats.map(e => e.name).join('<br>') : '';
    },

    performEditing() {
      const str = this.$refs.seatsInput.innerHTML;
      const seats = str.split('<br>')
        .filter(e => e.length > 0)
        .map(e => ({ name: e, present: false }));
      this.$emit('update-seats', seats);
      this.editFlag = false;
    },

    discardEditing() {
      this.editFlag = false;
    },

    toggleStatus(seat) {
      if(!this.authorized) return;
      // TODO: immutables
      seat.present = !seat.present;
      this.$emit('update-seats', this.seats);
    },

    sort() {
      this.$refs.seatsInput.innerHTML = this.$refs.seatsInput.innerHTML
        .split('<br>')
        .filter(e => e.length > 0)
        .map(e => ({
          original: e,
          pinyin: pinyin(e, {
            style: pinyin.STYLE_NORMAL,
            segment: true,
          }),
        }))
        .sort((a, b) => {
          for(let i = 0; i <= a.original.length; ++i) {
            if(i === b.original.length)
              return i === a.original.length ? 0 : 1;
            else if(i === a.original.length) return -1;

            if(a.original.charCodeAt(i) > 127)
              if(b.original.charCodeAt(i) > 127) break;
              else return 1; // b[i] is ascii, a[i] is not
            else if(b.original.charCodeAt(i) > 127)
              return -1; // a[i] is ascii, b[i] is not

            const lc = a.original.charAt(i).localeCompare(b.original.charAt(i));
            if(lc !== 0) return lc;
          }

          for(let i = 0; i < a.pinyin.length; ++i) {
            if(i === b.pinyin.length) return 1; // a > b
            const lc = a.pinyin[i][0].localeCompare(b.pinyin[i][0]);
            if(lc !== 0) return lc;
          }

          if(a.pinyin.length < b.pinyin.length) return -1;
          else return 0;
        })
        .map(e => e.original)
        .join('<br>');
    },
  },
});

module.exports = SeatsView;
