const os = require('os');
const fs = require('fs');
const path = require('path');

const Minio = require('minio');
const { BrowserWindow, Menu, app, shell } = require('electron');

function supportsTitlebarStyle() {
  if(os.platform() !== 'darwin') return false;
  const mainVer = parseInt(os.release().split('.')[0], 10);
  return Number.isInteger(mainVer) && mainVer >= 14; // 14 -> Yosemite
}

function isWindows() {
  const platform = os.platform();
  if(platform === 'win32') return true;

  // WSL
  return os.release().includes('Microsoft');
}

let _importerWin;

function getControllerMenu(controller) {
  const tmpl = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectall' },
        { type: 'separator' },
        {
          label: 'Import or Export Data',
          click(item, focusedWindow) {
            _importerWin = new BrowserWindow({
              width: 400,
              height: 250,
              frame: true,
              minimizable: false,
              modal: true,
              background: '#FFF',
              parent: focusedWindow || controller,
            });
            _importerWin.loadURL(`file://${__dirname}/importer/index.html`);
            _importerWin.on('close', () => {
              _importerWin = null;
            });
          },
        },
      ],
    },

    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.reload();
          },
        },
        {
          label: 'I am a developer',
          accelerator: os.platform() === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    {
      role: 'window',
      submenu: [
        {
          role: 'minimize',
        },
        {
          role: 'close',
        },
      ],
    },

    {
      role: 'help',
      submenu: [
        {
          label: 'Guide',
          click() { shell.openExternal('http://kb.bjmun.org/console-lite'); },
        },
        {
          label: 'Shortcut Cheatsheet',
          click() { shell.openExternal('http://kb.bjmun.org/console-lite/cheatsheet.html'); },
        },
        { type: 'separator' },
        {
          label: 'About Electron',
          click() { shell.openExternal('http://electron.atom.io'); },
        },
      ],
    },
  ];

  if(os.platform() === 'darwin') {
    tmpl.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          role: 'services',
          submenu: [],
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });

    tmpl[1].submenu.push(
      { type: 'separator' },
      {
        label: '语音',
        submenu: [
          {
            role: 'startspeaking',
          },
          {
            role: 'stopspeaking',
          },
        ],
      },
    );

    tmpl[3].submenu = [
      {
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      },
      {
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize',
      },
      {
        role: 'zoom',
      },
      {
        type: 'separator',
      },
      {
        role: 'front',
      },
    ];
  } else tmpl[0].submenu.push({ role: 'quit' });

  return Menu.buildFromTemplate(tmpl);
}

function applyControllerMenu(win) {
  const menu = getControllerMenu(win);
  if(os.platform() === 'darwin')
    Menu.setApplicationMenu(menu);
  else
    win.setMenu(menu);
}

function getProjectorMenu() {
  const tmpl = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.reload();
          },
        },
        {
          label: 'I am a developer',
          accelerator: os.platform() === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    {
      role: 'window',
      submenu: [
        {
          role: 'minimize',
        },
        {
          role: 'close',
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(tmpl);
}

function applyProjectorMenu(win) {
  if(os.platform() === 'darwin') return;
  win.setMenu(getProjectorMenu());
}

let _mc;

function _verCmp(a, b) {
  for(let i = 0; i < 3; ++i)
    if(a[i] > b[i]) return 1;
    else if(a[i] < b[i]) return -1;

  return 0;
}

function checkForUpdate() {
  return new Promise((resolve, reject) => {
    if(!_mc) _mc = new Minio.Client({
      endPoint: 'store.bjmun.org',
      secure: true,
    });

    fs.readFile(path.join(__dirname, 'VERSION'), (err, buf) => {
      if(err) return void reject(err);

      const info = buf.toString('utf-8').split('\n')[0]
        .match(/^Console-Lite-v(\d+)\.(\d+)\.(\d+)-([^-]*)-([^-.]*)(-nofont)?(.*)$/);

      if(!info) return void resolve(false);

      const [, ver1, ver2, ver3, platform, arch, font, tail] = info;

      // eslint-disable-next-line prefer-template
      const re = /^Console-Lite-v(\d+)\.(\d+)\.(\d+)-/.source
                 + platform + '-' + arch + (font === undefined ? '' : font) + tail + '$';

      let newest = [ver1, ver2, ver3];
      let newestData = null;

      _mc.listObjects('console-lite')
        .on('data', obj => {
          const objinfo = obj.name.match(re);

          if(!objinfo) return;

          objinfo.shift();
          if(_verCmp(objinfo, newest) < 1) return;

          newest = objinfo;
          newestData = obj;
        })
        .on('error', err => reject(err))
        .on('end', () => resolve([newestData, newest]));
    });
  });
}

module.exports = {
  supportsTitlebarStyle,
  isWindows,
  getControllerMenu,
  applyControllerMenu,
  getProjectorMenu,
  applyProjectorMenu,
  checkForUpdate,
};
