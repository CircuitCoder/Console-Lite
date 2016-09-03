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
    ], // Ignores databases and files
    tmpdir: false,
    icon: path.join(__dirname, '../images/icon'),
  };

  if(process.env.ELECTRON_MIRROR)
    opt.download = {
      mirror: process.env.ELECTRON_MIRROR,
    };

  packager(opt, (err, paths) => {
    if(err) {
      if(!silent) {
        console.error('Packager failed:');
        console.error(err.stack);
      }
      if(cb) cb(err);
    } else {
      if(!silent)
        console.log(`Package outputted to: ${paths}`);
      if(cb) cb(null, paths);
    }
  });
}

if(require.main === module) pack();

module.exports = pack;
