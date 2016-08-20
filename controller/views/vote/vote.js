const Vue = require('vue');
const fs = require('fs');

const VoteView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/vote.html`).toString('utf-8'),
  props: [
    'vote',
  ],
});

module.exports = VoteView;
