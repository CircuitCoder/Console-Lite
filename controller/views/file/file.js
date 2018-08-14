const Vue = require('vue/dist/vue.common.js');
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

  mounted() {
    this.$emit('get-file', this.file.id, (err, cont) => {
      if(err) return void alert('加载失败!');
      else {
        this.type = util.getFileType(this.file.type);
        this.fileCont = cont;

        if(this.type === 'pdf') {
          this.clearPDF();
          this.renderPDF(1);
        }

        /* Images, markdown files and other types are handled automatically */
      }
    });
  },

  methods: {
    clearPDF() {
      while(this.$refs.pages.firstChild)
        this.$refs.pages.removeChild(this.$refs.pages.firstChild);
    },

    renderPDF(scale) {
      return util.renderPDF(new Uint8Array(this.fileCont), scale, this.$refs.pages);
    },

    project() {
      this.$emit('project-file', this.file);
    },

    save() {
      dialog.showSaveDialog({
        title: '保存文件',
        defaultPath: this.file.name,
      }, filename => {
        if(!filename) return;
        const buf = Buffer.from(this.fileCont);

        fs.writeFile(filename, buf, err => {
          if(err) dialog.showErrorBox('保存失败', err.stack);
          else dialog.showMessageBox({
            type: 'info',
            buttons: ['打开文件', '好的'],
            defaultId: 1,
            cancelId: 1,
            message: '保存成功!',
            detail: `保存到 ${filename}`,
          }, btn => {
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

      const { type } = dt.files[0];
      if(type !== this.file.type) {
        this.dragging = false;
        alert(`请上传同样类型的文件: ${type}`);
        return;
      }

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$emit('edit-file', this.file.id, data);
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
      const blob = new Blob([this.fileCont], { type: this.file.type });
      return URL.createObjectURL(blob);
    },

    mdRendered() {
      const str = new TextDecoder('utf-8').decode(this.fileCont);
      return util.renderMD(str);
    },
  },
});

module.exports = FileView;
