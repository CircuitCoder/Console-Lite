const { rebuild } = require('electron-rebuild');

const process = require('process');
const fs = require('fs');
const path = require('path');

function locateElectronBase() {
  let electronPath = path.join(__dirname, '..', '..', 'electron');
  if(!fs.existsSync(electronPath))
    electronPath = path.join(__dirname, '..', '..', 'electron-prebuilt');
  if(!fs.existsSync(electronPath))
    electronPath = path.join(__dirname, '..', '..', 'electron-prebuilt-compile');
  if(!fs.existsSync(electronPath))
    try {
      electronPath = path.join(require.resolve('electron'), '..');
    } catch(e) {
      // Module not found, do nothing
    }
  if(!fs.existsSync(electronPath))
    try {
      electronPath = path.join(require.resolve('electron-prebuilt'), '..');
    } catch(e) {
      // Module not found, do nothing
    }
  if(!fs.existsSync(electronPath))
    electronPath = null;
  return electronPath;
}

console.log('Rebuilding native modules...');

const electronBase = locateElectronBase();
const electronPkg = JSON.parse(fs.readFileSync(path.join(electronBase, 'package.json')));
const electronVer = electronPkg.version;

console.log(`Electron version: ${electronVer}`);

const headerURL = process.env.ELECTRON_HEADER;

rebuild({
  buildPath: path.resolve(__dirname, '..'),
  electronVersion: electronVer,
  headerURL,
})
  .then(() => console.info('Rebuild successful'))
  .catch(e => {
    console.error(e);
  });
