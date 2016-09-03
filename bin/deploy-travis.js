/* eslint-disable new-cap */
const pack = require('./pack');

const assert = require('assert');
const fs = require('fs');
const fstream = require('fstream');
const minio = require('minio');
const os = require('os');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');
const tar = require('tar');
const zlib = require('zlib');

let tag;

if(process.env.TRAVIS_TAG && /^v\d+\.\d+\.\d+/.test(process.env.TRAVIS_TAG))
  tag = process.env.TRAVIS_TAG;
else if(process.env.TEST_UPLOAD)
  tag = `c${process.env.TRAVIS_COMMIT}`;
else
  process.exit(0);

console.log(`Deploying as ${tag}`);

const gzipOpt = {
  memLevel: 9,
  level: 9,
};

const basedir = path.dirname(__dirname);
const targetdir = path.join(basedir, 'Console Lite');

new Promise((resolve, reject) => pack((err, paths) => err ? reject(err) : resolve(paths)))
.then(paths => new Promise((resolve, reject) => {
  assert(paths.length === 1);
  const p = paths[0];

  rimraf.sync(targetdir);
  fs.renameSync(p, targetdir);
  const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}.tar.gz`;

  console.log(`Packing: ${fname}`);

  fstream.Reader({
    path: targetdir,
    type: 'Directory',
  })
  .pipe(tar.Pack())
  .pipe(zlib.createGzip(gzipOpt))
  .pipe(fs.createWriteStream(path.join(basedir, fname)))
  .on('finish', () => resolve([path.join(basedir, fname)]))
  .on('error', reject);
}))
.then(artifacts => {
  const mc = new minio({
    endPoint: 'store.bjmun.org',
    secure: true,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  });

  return Promise.all(artifacts.map(artifact => new Promise((resolve, reject) => {
    mc.fPutObject('console-lite', artifact.split(/\./)[0], artifact, 'application/tar+gzip',
                  (err, etag) => err ? reject(err) : resolve([artifact, etag]));
  })));
})
.then(() => {
  console.log('Deployment completed');
})
.catch(e => {
  console.error(e.stack);
  process.exit(1);
});
