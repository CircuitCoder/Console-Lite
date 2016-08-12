const Vue = require('vue');
const fs = require('fs');

const HomeComponent = Vue.extend({
  template: fs.readFileSync(`${__dirname}/seats.html`).toString('utf-8'),
  props: ['seats'],

  data() {
    return {
      editFlag: false,
    };
  },

  methods: {
    edit() {
      this.editFlag = true;
      this.$els.seatsInput.innerHTML = this.seats ? this.seats.map(e => e.name).join('<br>') : '';
    },

    performEditing() {
      const str = this.$els.seatsInput.innerHTML;
      this.seats = str.split('<br>').filter(e => e.length > 0).map(e => ({ name: e, present: false }));
      this.$dispatch('seats-updated');
      this.editFlag = false;
    },

    discardEditing() {
      this.editFlag = false;
    },

    toggleStatus(seat) {
      seat.present = ! seat.present;
      this.$dispatch('seats-updated');
    },

    blocker(event) {
      event.stopPropagation();
      event.preventDefault();
    },
  }
})

module.exports = HomeComponent;
