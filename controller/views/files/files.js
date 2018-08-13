const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

const FilesView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/files.html`).toString('utf-8'),
  props: {
    files: {},
    authorized: {},
    searchInput: { default: '', },
  },

  data: () => ({
    dragging: false,
  }),

  methods: {
    dragover() {
      if(this.authorized) this.dragging = true;
    },

    dragleave() {
      this.dragging = false;
    },

    dragend() {
      this.dragging = false;
    },

    drop(e) {
      if(!this.authorized) return;
      const dt = e.dataTransfer;
      if(dt.files.length !== 1) {
        this.dragging = false;
        alert('请每次只上传一个文件');
        return;
      }

      const { name, type } = dt.files[0];

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$emit('add-file', name, type, data);
      });

      this.dragging = false;
    },

    viewFile(file) {
      this.$emit('view-file', file);
    },
  },

  computed: {
    filteredFiles() {
      if(this.searchInput) return this.files.filter(e =>
        e.name.indexOf(this.searchInput) !== -1 || e.type.indexOf(this.searchInput) !== -1);
      return this.files;
    },
  },
});

module.exports = FilesView;
