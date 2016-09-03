/* eslint-disable camelcase */

const pack = require('./pack');
const { upload, trim } = require('./deploy-util');

const assert = require('assert');
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');

const basedir = path.dirname(__dirname);
const targetdir = path.join(basedir, 'Console Lite');

let tag;

if(process.env.APPVEYOR_REPO_TAG && /^v\d+\.\d+\.\d+/.test(process.env.APPVEYOR_REPO_TAG_NAME))
  tag = process.env.APPVEYOR_TAG_NAME;
else if(process.env.TEST_UPLOAD)
  tag = `COMMIT_${process.env.APPVEYOR_REPO_COMMIT}`;
else
  process.exit(0);

new Promise((resolve, reject) => pack((err, paths) => err ? reject(err) : resolve(paths)))
.then(paths => new Promise((resolve) => {
  assert(paths.length === 1);
  const p = paths[0];

  rimraf.sync(targetdir);
  fs.renameSync(p, targetdir);
  const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}.7z`;

  console.log(`Packing: ${fname}`);

  child_process
    .spawnSync('7z', ['a', '-t7z', '-m0=lzma', '-mx=9', path.join(basedir, fname), targetdir]);
  resolve([[fname, path.join(basedir, fname), 'application/7z']]);
}))
.then(artifacts => trim(targetdir, artifacts))
.then(artifacts => {
  const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}-nofont.7z`;

  console.log(`Packing: ${fname}`);

  child_process
    .spawnSync('7z', ['a', '-t7z', '-m0=lzma', '-mx=9', path.join(basedir, fname), targetdir]);

  return artifacts.concat([[fname, path.join(basedir, fname), 'application/7z']]);
})
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
