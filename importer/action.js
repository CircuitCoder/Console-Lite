const Vue = require('vue');
const { remote, ipcRenderer } = require('electron');

const desc = {
  el: 'body',
  data: {
    status: 0,
    disabled: false,
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

    odrag(e) {
      if(this.disabled) return;

      this.status = -1;
    },

    odragstart(e) {
      if(this.disabled) return;

      const now = new Date();
      e.dataTransfer.setData('DownloadURL',
        `application/x-tar:clexport.${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.tar:clexport://down`); // eslint-disable-line: max-len
    },

    oundrag() {
      if(this.status === -1) this.status = 0;
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
      const type = dt.files[0].type;
      const segs = dt.files[0].path.split('.');
      if(type !== 'application/x-tar') {
        alert('请添加一个 tar 文件');
        return;
      }

      ipcRenderer.send('doImport', dt.files[0].path);
      ipcRenderer.once('importCb', (ev, err) => {
        if(err) {
          alert('导入失败');
          console.error(err);
        } else 
          alert('导入成功!');
      });
    },

    exit() {
      remote.getCurrentWindow().close();
    },
  }
}

function setup() {
  const inst = new Vue(desc);
  inst.init();
}
