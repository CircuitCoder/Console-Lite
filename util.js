const os = require('os');
const { Menu, app } = require('electron');

function supportsTitlebarStyle() {
  if(os.platform() !== 'darwin') return;
  const mainVer = parseInt(os.release().split('.')[0]);
  return Number.isInteger(mainVer) && mainVer >= 14; // 14 -> Yosemite
}

function isWindows() {
  return os.platform() === 'win32';
}

function getControllerMenu() {
  const tmpl = [
    {
      label: '编辑',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectall' },
      ],
    },

    {
      label: '视图',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: '我是开发者',
          accelerator: os.platform() === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ],
    },

    {
      label: '窗口',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ],
    },

    {
      role: 'help',
      submenu: [
        {
          label: '关于 Electron',
          click() { require('electron').shell.openExternal('http://electron.atom.io') }
        }
      ]
    }
  ];

  if(os.platform() === 'darwin') {
    tmpl.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    tmpl[1].submenu.push(
      { type: 'separator' },
      {
        label: '语音',
        submenu: [
          {
            role: 'startspeaking'
          },
          {
            role: 'stopspeaking'
          }
        ]
      }
    );

    tmpl[3].submenu = [
      {
        label: '关闭',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: '最小化',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: '最大化',
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      {
        label: '置于前方',
        role: 'front'
      }
    ]

  } else {
    tmpl[0].submenu.push({ role: 'quit' });
  }

  return Menu.buildFromTemplate(tmpl);
}

function applyControllerMenu(win) {
  const menu = getControllerMenu();
  if(os.platform() === 'darwin')
    Menu.setApplicationMenu(menu);
  else
    win.setMenu(menu);
}

function getProjectorMenu() {
  const tmpl = [
    {
      label: '视图',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: '我是开发者',
          accelerator: os.platform() === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ],
    },

    {
      label: '窗口',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ],
    },
  ];

  return Menu.buildFromTemplate(tmpl);
}

function applyProjectorMenu(win) {
  if(os.platform() === 'darwin') return;
}

module.exports = {
  supportsTitlebarStyle,
  isWindows,
  getControllerMenu,
  applyControllerMenu,
  getProjectorMenu,
  applyProjectorMenu,
};
