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
      this.$els.seatsInput.innerHTML = this.seats ? this.seats.join('<br>') : '';
    },

    performEditing() {
      const str = this.$els.seatsInput.innerHTML;
      this.seats = str.split('<br>').filter(e => e.length > 0);
      this.$dispatch('seatsUpdated');
      this.editFlag = false;
      console.log(this.seats);
    },

    discardEditing() {
      this.editFlag = false;
    },

    blocker(event) {
      event.stopPropagation();
      event.preventDefault();
    },
  }
})

module.exports = HomeComponent;
