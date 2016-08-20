const electron = require('electron');
const {ipcMain, app, BrowserWindow} = electron;
const server = require('./server/server');
const util = require('./util');

const name = 'Console Next';

app.setName(name);

// Windows, not the OS, but windows
let controller, projector;

const controllerOpt = {
  width: 800,
  height: 600,
  frame: false,
  background: '#FFF',
  icon: __dirname + '/images/icon_256x256.png',
};

const projectorOpt = {
  width: 800,
  height: 600,
  frame: false,
  autoHideMenuBar: true,
  icon: __dirname + '/images/icon_256x256.png',
}

if(util.supportsTitlebarStyle()) {
  controllerOpt.frame = true;
  projectorOpt.frame = true;
  controllerOpt.titleBarStyle = 'hidden';
  projectorOpt.titleBarStyle = 'hidden';
} else if(util.isWindows()) {
  controllerOpt.frame = true;
  projectorOpt.frame = true;
}

function initController() {
  controller = new BrowserWindow(controllerOpt);
  util.applyControllerMenu(controller);
  controller.loadURL(`file://${__dirname}/controller/index.html`);
  controller.on('closed', () => {
    controller = null;

    /* Close projector as well */
    if(projector) projector.close();
  });
}

function initProjector() {
  // Ensures that previous windows are closed
  if(projector) projector.close();

  projector = new BrowserWindow(projectorOpt);
  projector.loadURL(`file://${__dirname}/projector/index.html`);
  util.applyProjectorMenu(controller);
  projector.on('closed', () => {
    projector = null;
    if(controller) controller.webContents.send('projectorClosed');
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

ipcMain.on('openProjector', (event, data) => {
  initProjector();
  event.sender.send('projectorReady');
});

ipcMain.on('closeProjector', (event, data) => {
  if(projector) projector.close();
});

ipcMain.on('toProjector', (event, data) => {
  if(projector) projector.webContents.send('fromController', data);
});

ipcMain.on('getProjector', (event, data) => {
  if(!projector) event.returnValue = null;
  else event.returnValue = projector.id;
});

app.on('quit', () => {
  if(serverStarted) shutdown();
});
