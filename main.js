const electron = require('electron');
const {app, BrowserWindow} = electron;

// Windows, not the OS, but windows
let controller, projector;

function initController() {
  controller = new BrowserWindow({ width: 800, height: 600 });
  controller.loadURL(`file://${__dirname}/controller/index.html`);
  controller.webContents.openDevTools();
  controller.on('closed', () => {
    controller = null;
  });
}

function initDisplay() {
  projector = new BrowserWindow({ width: 800, height: 600 });
  projector.loadURL(`file://${__dirname}/projector/index.html`);
  projector.on('closed', () => {
    projector = null;
  });
}

app.on('ready', () => {
  initController();
});

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin')
    app.quit();
});

app.on('activate', () => {
  if(!controller)
    initController();
});
