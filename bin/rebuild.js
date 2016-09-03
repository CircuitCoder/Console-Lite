const {
  installNodeHeaders,
  rebuildNativeModules,
  shouldRebuildNativeModules } = require('electron-rebuild');

const electronExe = require('electron');
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
const electronPkg = require(path.join(electronBase, 'package.json'));
const electronVer = electronPkg.version;

shouldRebuildNativeModules(electronExe)
  .then(shouldRebuild => {
    if(!shouldRebuild) {
      console.log('Native modules ready.');
      return Promise.resolve();
    }

    console.log(electronVer);
    return installNodeHeaders(electronVer, 'https://atom.io/download/atom-shell')
    .then(() => rebuildNativeModules(electronVer, `${__dirname}/../node_modules`,
                                     '--build-from-source'));
  })
  .then(() => {
    console.log('Rebuilding finished.');
  })
  .catch(e => {
    console.error('Rebuilding failed:');
    console.error(e.stack);
    process.exit(1);
  });
