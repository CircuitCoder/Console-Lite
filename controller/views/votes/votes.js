const Vue = require('vue');
const fs = require('fs');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/votes.html`).toString('utf-8'),
  props: [
    'votes',
    {
      name: 'searchInput',
      default: '',
    },
  ],
});

module.exports = VoteView;
