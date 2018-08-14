const path = require('path');
const mkdirp = require('mkdirp');

let dataDir = path.resolve(__dirname, 'backend');

function storagePath() {
  return path.resolve(dataDir, './storage');
}

function setDataDir(dir) {
  dataDir = dir;
  mkdirp.sync(storagePath());
}

function dbPath(name) {
  return path.join(storagePath(), `${name}.db`);
}

function filePath(name) {
  return path.join(storagePath(), `${name}.files`);
}

module.exports = {
  setDataDir,
  storagePath,
  dbPath,
  filePath,
};
