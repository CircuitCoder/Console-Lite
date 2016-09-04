const Vue = require('vue');
const fs = require('fs');
const { dialog } = require('electron').remote;
const { shell } = require('electron');

const util = require('../../../shared/util.js');

const FileView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/file.html`).toString('utf-8'),
  props: [
    'file',
    'authorized',
  ],

  data: () => ({
    dragging: false,
    type: 'download',
    rendered: '',
  }),

  activate(done) {
    this.$dispatch('get-file', this.file.id, (err, cont) => {
      if(err) return alert('加载失败!');
      else {
        this.type = util.getFileType(this.file.type);
        this.fileCont = cont;

        if(this.type === 'pdf') {
          this.clearPDF();
          return this.renderPDF(1).then(done);
        } else if(this.type === 'image')
          return done();
        else
          // Display download link
          return done();
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

    save() {
      dialog.showSaveDialog({
        title: '保存文件',
        defaultPath: this.file.name,
      }, (filename) => {
        if(!filename) return;
        const buf = new Buffer(this.fileCont.byteLength);
        const view = new Uint8Array(this.fileCont);

        for(let i = 0; i < buf.length; ++i)
          buf[i] = view[i];

        fs.writeFile(filename, buf, (err) => {
          if(err) dialog.showErrorBox('保存失败', err.stack);
          else dialog.showMessageBox({
            type: 'info',
            buttons: ['打开文件', '好的'],
            defaultId: 1,
            cancelId: 1,
            message: '保存成功!',
            detail: `保存到 ${filename}`,
          }, (btn) => {
            if(btn === 0)
              shell.openItem(filename);
          });
        });
      });
    },

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

      const type = dt.files[0].type;
      if(type !== this.file.type) {
        this.dragging = false;
        alert(`请上传同样类型的文件: ${type}`);
        return;
      }

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$dispatch('edit-file', this.file.id, data);
      });

      this.dragging = false;
    },

    scroll() {
      // TODO: sync scroll
    },
  },

  computed: {
    shortName() {
      return this.file.name.split('.')[0];
    },

    imgRendered() {
      const b64str = btoa(String.fromCharCode(...new Uint8Array(this.fileCont)));
      return `data:${this.file.type};base64,${b64str}`;
    },
  },
});

module.exports = FileView;
