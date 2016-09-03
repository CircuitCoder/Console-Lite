/* eslint-disable new-cap */

const pack = require('./pack');
const { upload, trim } = require('./deploy-util');

const assert = require('assert');
const fs = require('fs');
const fstream = require('fstream');
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
  tag = `COMMIT_${process.env.TRAVIS_COMMIT}`;
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
  .on('finish', () => resolve([[fname, path.join(basedir, fname), 'application/tar+gzip']]))
  .on('error', reject);
}))
.then(artifacts => trim(targetdir, artifacts))
.then(artifacts => new Promise((resolve, reject) => {
  const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}-nofont.tar.gz`;

  console.log(`Packing: ${fname}`);

  fstream.Reader({
    path: targetdir,
    type: 'Directory',
  })
  .pipe(tar.Pack())
  .pipe(zlib.createGzip(gzipOpt))
  .pipe(fs.createWriteStream(path.join(basedir, fname)))
  .on('finish', () => resolve(artifacts.concat([[
    fname, path.join(basedir, fname),
    'application/tar+gzip',
  ]])))
  .on('error', reject);
}))
.then(artifacts => {
  console.log('Uploading:');
  for(const a of artifacts) console.log(`\t${a[0]}`);
  return artifacts;
})
.then(artifacts => upload(artifacts))
.then(() => {
  console.log('Deployment completed');
})
.catch(e => {
  console.error(e.stack);
  process.exit(1);
});
