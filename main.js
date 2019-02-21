const electron = require('electron');
const { ipcMain, app, protocol, globalShortcut, BrowserWindow, screen, } = electron;
const path = require('path');
const tar = require('tar');
const fs = require('fs');
const os = require('os');
const rimraf = require('rimraf');

const server = require('./server/server');
const serverUtil = require('./server/util');
const util = require('./util');

const name = 'Console Lite';

app.setName(name);

console.log(`userData locates at ${app.getPath('userData')}`);
serverUtil.setDataDir(app.getPath('userData'));

// Windows, not the OS, but windows
let controller;
let projector;

let serverStarted = false;

const controllerOpt = {
  width: 800,
  height: 600,
  frame: false,
  background: '#FFF',
  icon: path.join(__dirname, 'images', 'icon_256x256.png'),
};

const projectorOpt = {
  width: 800,
  height: 600,
  frame: false,
  autoHideMenuBar: true,
  icon: path.join(__dirname, 'images', 'icon_256x256.png'),
};

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

  const displays = screen.getAllDisplays();
  let shouldFillScreen = false;
  if(displays.length <= 1) {
    projectorOpt.x = 0;
    projectorOpt.y = 0;
  } else
    for(let i = 0; i < displays.length; i++)
      if(displays[i].bounds.x !== 0 || displays[i].bounds.y !== 0) {
        const externalDisp = displays[i];
        projectorOpt.x = externalDisp.bounds.x;
        projectorOpt.y = externalDisp.bounds.y;
        shouldFillScreen = true;
        break;
      }

  projector = new BrowserWindow(projectorOpt);
  projector.loadURL(`file://${__dirname}/projector/index.html`);
  util.applyProjectorMenu(projector);

  projector.webContents.on('dom-ready', () => {
    if(shouldFillScreen && projector.isMaximizable()) projector.maximize();
  });

  projector.on('closed', () => {
    projector = null;
    if(controller) controller.webContents.send('projectorClosed');
  });
}

function createExportStream() {
  if(serverStarted) throw new Error('Server is running');
  const dir = serverUtil.storagePath();

  return tar.c({
    C: dir,
    prefix: 'storage',
  }, fs.readdirSync(dir));
}

function setupExportHandler() {
  protocol.registerBufferProtocol('clexport', (request, callback) => {
    if(serverStarted) return void callback({ error: 'Server is running' });

    const buffers = [];
    createExportStream()
      .on('data', data => {
        buffers.push(data);
      })
      .on('end', () => {
        callback(Buffer.concat(buffers));
      })
      .on('error', err => callback({ error: err }));
  });
}

app.on('ready', () => {
  setupExportHandler();
  initController();
  globalShortcut.register('CommandOrControl+\\', () => {
    if(controller) controller.focus();
    else initController();
  });

  globalShortcut.register('CommandOrControl+Shift+|', () => {
    if(projector) projector.focus();
    else initProjector();
  });
});

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin')
    app.quit();
});

app.on('activate', () => {
  if(!controller)
    initController();
});

let passkey;
let idkey;
let backendPort = 4928;

let shutdown;

/**
 * Get a random external IPv4 address
 */

function getExtIPv4Addr() {
  const ifaces = os.networkInterfaces();

  // This is an plain object. Prototype properties shouldn't be a problem
  // eslint-disable-next-line guard-for-in
  for(const ifname in ifaces)
    for(const alias of ifaces[ifname])
      if(alias.family === 'IPv4' && !alias.internal)
        return alias.address;

  // No external address. So no host other than localhost can connect to this server.
  // Hence loopback is safe to be returned here.

  return '127.0.0.1';
}

ipcMain.on('startServer', (event, opts) => {
  if(serverStarted) {
    event.sender.send(
      'serverCallback',
      { url: `http://${getExtIPv4Addr()}:${backendPort}`, passkey, idkey },
    );

    return;
  }

  server((err, pk, ik, port, sd) => {
    if(err) {
      console.error(err);
      event.sender.send('serverCallback', { error: err });
      return;
    }

    serverStarted = true;
    passkey = pk;
    idkey = ik;
    shutdown = sd;
    backendPort = port;

    event.sender.send(
      'serverCallback',
      { url: `http://${getExtIPv4Addr()}:${port}`, passkey, idkey },
    );
  }, opts);
});

ipcMain.on('isServerRunning', event => {
  event.returnValue = serverStarted;
});

ipcMain.on('openProjector', () => {
  initProjector();
});

ipcMain.on('closeProjector', () => {
  if(projector) projector.close();
});

ipcMain.on('toProjector', (event, data) => {
  if(projector) projector.webContents.send('fromController', data);
});

ipcMain.on('getProjector', event => {
  if(!projector) event.returnValue = null;
  else event.returnValue = projector.id;
});

ipcMain.on('projectorInitialized', () => {
  if(controller) controller.webContents.send('projectorReady');
});

ipcMain.on('checkForUpdate', ev => {
  util.checkForUpdate().then(([data, ver]) => {
    if(!data) return;
    ev.sender.send('updateAvailable', { detail: data, version: `v${ver[0]}.${ver[1]}.${ver[2]}` });
  }).catch(e => console.error(e.stack));
});

ipcMain.on('doImport', (ev, data) => {
  const targetDir = serverUtil.storagePath();

  rimraf(path.join(targetDir, '*'), err => {
    if(err) return void ev.sender.send('importCb', err);
    fs.createReadStream(data)
      .pipe(tar.x({
        C: targetDir,
        strip: 1,
      }))
      .on('end', () => ev.sender.send('importCb', null))
      .on('error', err => ev.sender.send('importCb', err));
  });
});

ipcMain.on('directExport', (ev, dir) => {
  const f = fs.createWriteStream(dir);
  createExportStream().pipe(f)
    .on('finish', () => {
      f.close(() => ev.sender.send('exportCb', null));
    })
    .on('error', e => {
      fs.unlinkSync(dir);
      ev.sender.send('exportCb', e);
    });
});

app.on('quit', () => {
  if(serverStarted) shutdown(e => console.error(e));
});
