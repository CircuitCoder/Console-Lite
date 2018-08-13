const Vue = require('vue/dist/vue.common.js');
const { remote, ipcRenderer } = require('electron');

const http = require('http');
const fs = require('fs');

const desc = {
  data: {
    status: 0,
    disabled: false,
  },

  mounted() {
    this.init();
  },

  methods: {
    init() {
      this.disabled = ipcRenderer.sendSync('isServerRunning');
    },

    idrag() {
      if(this.disabled) return;

      if(this.status === 0) this.status = 1;
    },

    iundrag() {
      if(this.status === 1) this.status = 0;
    },

    ofilename() {
      const now = new Date();
      return `clexport.${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.tar`;
    },

    odrag() {
      if(this.disabled) return;

      this.status = -1;
    },

    odragstart(e) {
      if(this.disabled) return;

      e.dataTransfer.setData('DownloadURL',
        `application/x-tar:${this.ofilename()}:clexport://down`); // eslint-disable-line max-len
    },

    oundrag() {
      if(this.status === -1) this.status = 0;
    },

    odirect() {
      const opath = remote.dialog.showSaveDialog({
        defaultPath: this.ofilename(),
      });

      if(!opath) return; // Cancelled

      ipcRenderer.send('directExport', opath);
      ipcRenderer.once('exportCb', (ev, err) => {
        if(err) {
          alert('导出失败');
          console.error(err);
        } else {
          alert('导出成功!');
          this.exit()
        }
      });
    },

    drop(e) {
      if(this.disabled) return;
      if(this.status !== 1) return;

      this.status = 0;

      const dt = e.dataTransfer;
      if(dt.files.length !== 1) {
        alert('请只添加一个文件');
        return;
      }

      console.log(dt);
      const { type } = dt.files[0];
      if(type !== 'application/x-tar') {
        alert('请添加一个 tar 文件');
        return;
      }

      ipcRenderer.send('doImport', dt.files[0].path);
      ipcRenderer.once('importCb', (ev, err) => {
        if(err) {
          alert('导入失败');
          console.error(err);
        } else {
          alert('导入成功!');
          this.exit()
        }
      });
    },

    exit() {
      remote.getCurrentWindow().close();
    },
  },
};

// eslint-disable-next-line no-unused-vars
function setup() {
  const inst = new Vue(desc);
  inst.$mount('#app');

  window.addEventListener('keydown', ev => {
    if(ev.key === 'Escape') inst.exit();
    else if(ev.key === 'e') inst.odirect();
  });
}
