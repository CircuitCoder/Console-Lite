const packager = require('electron-packager');
const process = require('process');
const path = require('path');

function pack(cb, silent) {
  if(!silent) {
    console.log(`Building package for ${process.platform} - ${process.arch}.`);
    console.log('Please ensure that native dependecies are built using correct ABI version');
  }

  const opt = {
    arch: process.arch,
    platform: process.platform,
    out: path.dirname(__dirname),
    dir: path.dirname(__dirname),
    prune: true,
    ignore: [
      /^\/server\/.*\.db($|\/)/,
      /^\/server\/.*\.files($|\/)/,
      /^\/Console Lite/,
      /^\/Console-Lite-/,
    ], // Ignores databases, files and artifacts
    icon: path.join(__dirname, '../images/icon'),
  };

  if(process.env.ELECTRON_MIRROR)
    opt.download = {
      mirror: process.env.ELECTRON_MIRROR,
    };

  packager(opt)
    .then(paths => {
      console.log(paths);
      if(!silent)
        console.log(`Package outputted to: ${paths}`);
      if(cb) cb(null, paths);
    })
    .catch(err => {
      if(!silent) {
        console.error('Packager failed:');
        console.error(err.stack);
      }
      if(cb) cb(err);
    });
}

/* eslint-disable global-require */

if(require.main === module) {
  const ora = require('ora');
  const ind = ora('Packaging').start();

  pack((err, paths) => {
    if(err) {
      ind.fail();
      console.error(err.stack);
    } else {
      ind.text = `Package outputted to: ${paths}`;
      ind.succeed();
    }
  }, true);
}

module.exports = pack;
