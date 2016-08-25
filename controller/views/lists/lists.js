const Vue = require('vue');
const fs = require('fs');

const ListsView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/lists.html`).toString('utf-8'),
  props: [
    'lists',
    {
      name: 'searchInput',
      default: '',
    },
  ],

  data: () => ({
    addFlag: false,
    name: '',
    totTime: 0,
    eachTime: 0,
  }),

  methods: {
    add() {
      this.totTime = 0;
      this.eachtime = 0;
      this.name = '';
    },

    performAdd() {
      if(this.eachTime === 0) return;
      if(this.name === '') return;

      this.$dispatch('add-list', this.name, [], this.totTime, this.eachTime);
      this.addFlag = false;
    },

    project(list) {
      this.$dispatch('project-list', list)
    },

    navigateTo(list) {
      this.$dispatch('view-list', list);
    }
  }
});

module.exports = ListsView;
