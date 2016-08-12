const electron = require('electron');
const {ipcMain, app, BrowserWindow} = electron;
const server = require('./server/server');

// Windows, not the OS, but windows
let controller, projector;

function initController() {
  controller = new BrowserWindow({ width: 800, height: 600, frame: false });
  controller.loadURL(`file://${__dirname}/controller/index.html`);
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

let serverStarted = false;
let passkey;
let shutdown;

ipcMain.on('startServer', (event, data) => {
  if(serverStarted)
    return event.sender.send('serverCallback', { url: 'http://localhost:4928', passkey: passkey });

  server((err, pk, sd) => {
    if(err) {
      console.error(err);
      return event.sender.send('serverCallback', { error: err });
    }

    serverStarted = true;
    passkey = pk;
    shutdown = sd;
    event.sender.send('serverCallback', { url: 'http://localhost:4928', passkey: passkey });
  });
});

app.on('quit', () => {
  if(serverStarted) shutdown();
});
