const packager = require('electron-packager');
const process = require('process');
const path = require('path');
const fs = require('fs');

console.log(`Building package for ${process.platform} - ${process.arch}.`);
console.log('Please ensure that native dependecies are built using correct ABI version');

const opt = {
  arch: process.arch,
  platform: process.platform,
  dir: path.normalize(__dirname + '/..'),
  tmpdir: false,
};

if(process.env.ELECTRON_MIRROR) {
  opt.download = {
    mirror: process.env.ELECTRON_MIRROR
  }
}

packager(opt, (err, paths) => {
  if(err) {
    console.error('Packager failed:');
    console.error(err.stack);
  }
});
