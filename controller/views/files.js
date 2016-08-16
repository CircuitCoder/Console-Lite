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
    dragstart(e) {
      console.log(e.dataTransfer.getData());
    },

    dragenter(e) {
      e.stopPropagation();
      e.preventDefault();
    },

    dragover(e) {
      //TODO: check file name
      e.stopPropagation();
      e.preventDefault();

      this.dragging = true;
    },

    dragleave(e) {
      e.stopPropagation();
      e.preventDefault();

      this.dragging = false;
    },

    dragend(e) {
      this.dragging = false;
    },

    drop(e) {
      e.stopPropagation();
      e.preventDefault();

      console.log("DROP");

      const dt = e.dataTransfer;
      if(dt.files.length !== 1) return console.log("Invalid number of files");

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$dispatch('add-file', dt.files[0].name.split('.')[0], 'pdf', data.toString('utf-8'));
      });

      this.dragging = false;
    }
  },
});

module.exports = FilesView;
