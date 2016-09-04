/* eslint-disable new-cap */

const minio = require('minio');
const os = require('os');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');

const mc = new minio({
  endPoint: 'store.bjmun.org',
  secure: true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

function upload(artifacts) {
  return artifacts.map(([name, dir, mime]) => new Promise((resolve, reject) => {
    mc.fPutObject('console-lite', name, dir, mime,
                  (err, etag) => err ? reject(err) : resolve([name, dir, etag]));
  }));
}

function trim(targetdir) {
  let fontbase;
  if(os.platform() === 'darwin')
    fontbase = path.join(targetdir, 'Console Lite.app', 'Contents', 'Resources', 'app', 'fonts');
  else
    fontbase = path.join(targetdir, 'resources', 'app', 'fonts');

  rimraf.sync(path.join(fontbase, 'NotoSansCJKsc-*'));
  rimraf.sync(path.join(fontbase, 'Roboto-*'));
}

module.exports = {
  upload,
  trim,
};
