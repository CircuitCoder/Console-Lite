const path = require('path');

let dataDir = path.resolve(__dirname, 'backend');

function setDataDir(dir) {
  dataDir = dir;
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
  storagePath,
  dbPath,
  filePath,
};
