const Vue = require('vue');
const fs = require('fs');

const FilesView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/files.html`).toString('utf-8'),
  props: [
    'files',
    {
      name: 'searchInput',
      default: '',
    },
  ],

  data: () => ({
    dragging: false,
  }),

  methods: {
    dragover(e) {
      //TODO: check file name
      this.dragging = true;
    },

    dragleave(e) {
      this.dragging = false;
    },

    dragend(e) {
      this.dragging = false;
    },

    drop(e) {
      const dt = e.dataTransfer;
      if(dt.files.length !== 1) return console.error("Invalid number of files");

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$dispatch('add-file', dt.files[0].name.split('.')[0], 'pdf', data);
      });

      this.dragging = false;
    },

    viewFile(file) {
      this.$dispatch('view-file', file);
    },
  },
});

module.exports = FilesView;
