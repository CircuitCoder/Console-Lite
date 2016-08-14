const { installNodeHeaders, rebuildNativeModules, shouldRebuildNativeModules } = require('electron-rebuild');
const pathToElectron = require('electron-prebuilt');
const childProcess = require('child_process');

console.log('Rebuilding native modules...');

shouldRebuildNativeModules(pathToElectron)
  .then(shouldRebuild => {
    if(!shouldRebuild) {
      console.log('Native modules ready.');
      return;
    }

    let electronVersion = childProcess.execSync(`${pathToElectron} --version`, {
      encoding: 'utf8',
    }).match(/v(\d+\.\d+\.\d+)/)[1];

    return installNodeHeaders(electronVersion, 'https://atom.io/download/atom-shell')
      .then(() => rebuildNativeModules(electronVersion, './node_modules'));
  })
  .then(() => {
    console.log('Rebuilding finished.');
  })
  .catch(e => {
    console.error('Rebuilding failed:');
    console.error(e.stack);
  });
