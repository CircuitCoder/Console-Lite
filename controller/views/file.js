const Vue = require('vue');
const fs = require('fs');

const util = require('../../shared/util.js');

const FileView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/file.html`).toString('utf-8'),
  props: [
    'file',
  ],

  data: () => ({
    dragging: false,
    type: 'download',
  }),
  
  activate(done) {
    console.log('ACTIVATE');
    this.$dispatch('get-file', this.file.id, (err, cont) => {
      if(err) alert('加载失败!');
      else {
        if(this.file.type === 'application/pdf') {
          this.type = 'pdf';
          this.fileCont = cont;
          for(var i = 0; i<cont.length; ++i) {
            this.fileCont[i] = cont[i];
          }

          this.clearPDF();
          return this.renderPDF(1).then(done);
        } else if(this.file.type.split('/')[0] === 'image') {
          this.type = 'image';
          const b64str = btoa(String.fromCharCode(...new Uint8Array(cont)));
          this.fileCont = `data:${this.file.type};base64,${b64str}`;
          return done();
        } else {
          // Display download link
          this.fileCont = cont;
          return done();
        }
      }
    });
  },

  methods: {
    clearPDF() {
      while(this.$els.pages.firstChild)
        this.$els.pages.removeChild(this.$els.pages.firstChild);
    },

    renderPDF(scale) {
      return util.renderPDF(this.fileCont, scale, this.$els.pages);
    },

    project() {
      this.$dispatch('project-file', this.file);
    },

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
      if(dt.files.length !== 1) {
        this.dragging = false;
        return alert('请每次只上传一个文件');
      }

      const nameSegs = dt.files[0].name.split('.');
      const type = dt.files[0].type;
      if(type !== this.file.type) {
        this.dragging = false;
        return alert(`请上传同样类型的文件: ${type}`);
      }

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$dispatch('edit-file', this.file.id, data);
      });

      this.dragging = false;
    },

    scroll(e) {
    },
  },

  computed: {
    shortName() {
      return this.file.name.split('.')[0];
    }
  },
});

module.exports = FileView;
