const path = require('path');
const mkdirp = require('mkdirp');

let dataDir = path.resolve(__dirname, 'backend');

function setDataDir(dir) {
  dataDir = dir;
  mkdirp.sync(storagePath());
}

function storagePath() {
  return path.resolve(dataDir, './storage');
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
