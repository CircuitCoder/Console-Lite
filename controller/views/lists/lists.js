const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const ListsView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/lists.html`).toString('utf-8'),
  props: {
    lists: {},
    authorized: {},
    searchInput: { default: '' },
  },

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

      this.$emit('add-list', this.name, [], this.totTime, this.eachTime);
      this.addFlag = false;
    },

    project(list) {
      this.$emit('project-list', list);
    },

    navigateTo(list) {
      this.$emit('view-list', list);
    },
  },

  computed: {
    filteredLists() {
      if(this.searchInput) return this.lists.filter(e => e.name.indexOf(this.searchInput) !== -1);
      return this.lists;
    },
  },
});

module.exports = ListsView;
