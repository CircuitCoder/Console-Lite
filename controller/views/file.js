const Vue = require('vue');
const fs = require('fs');

const pdfjs = require('pdfjs-dist/build/pdf.combined');

function toUint16A(str) {
  const buf = new ArrayBuffer(str.length * 2);
  const array = new Uint16Array(buf);

  for(var i=0; i<str.length; ++i)
    array[i] = str.charCodeAt(i);

  return array;
}

const FileView = Vue.extend({
  template: fs.readFileSync(`${__dirname}/file.html`).toString('utf-8'),
  props: [
    'file',
  ],

  data: () => ({
    dragging: false,
  }),
  
  activate(done) {
    console.log('ACTIVATE');
    this.$dispatch('get-file', this.file.id, (err, cont) => {
      if(err) alert('加载失败!');
      else {
        if(this.file.type === 'pdf') {
          //const buf = fs.readFileSync('/Users/CircuitCoder/Downloads/main.pdf');
          this.fileCont = cont;
          for(var i = 0; i<cont.length; ++i) {
            this.fileCont[i] = cont[i];
          }

          this.clearPDF();
          return this.renderPDF(1).then(done);
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
      while(this.$els.pages.firstChild) {
        this.$els.pages.removeChild(this.$els.pages.firstChild);
      }
    },

    renderPDF(scale) {
      return pdfjs.getDocument(this.fileCont).then(pdf => {
        const promises = [];
        for(let i = 1; i<=pdf.numPages; ++i) {
          promises.push(pdf.getPage(i).then(page => {
            const vp = page.getViewport(scale);
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = vp.height;
            canvas.width = vp.width;

            page.render({
              canvasContext: context,
              viewport: vp,
            });

            this.$els.pages.appendChild(canvas);
          }));
        }

        return Promise.all(promises);
      });
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
      const type = nameSegs.length === 0 ? 'unknown' : nameSegs[nameSegs.length - 1];
      if(type !== this.file.type) {
        this.dragging = false;
        return alert(`请上传同样类型的文件: ${this.file.type === 'unknown' ? '无后缀' : type.toUpperCase()}`);
      }

      fs.readFile(dt.files[0].path, (err, data) => {
        this.$dispatch('edit-file', this.file.id, data);
      });

      this.dragging = false;
    },
  },
});

module.exports = FileView;
