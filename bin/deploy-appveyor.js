/* eslint-disable camelcase */
/* eslint-disable new-cap */

const pack = require('./pack');
const { upload, trim, runTasks, Ping } = require('./deploy-util');

const assert = require('assert');
const child_process = require('child_process');
const fs = require('fs');
const listr = require('listr');
const os = require('os');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');

const { Observable } = require('rxjs/Observable');

const basedir = path.dirname(__dirname);
const targetdir = path.join(basedir, 'Console Lite');

const runListr = process.env.RUN_LISTR === 'true';

let tag;

if(process.env.APPVEYOR_REPO_TAG && /^v\d+\.\d+\.\d+/.test(process.env.APPVEYOR_REPO_TAG_NAME))
  tag = process.env.APPVEYOR_TAG_NAME;
else if(process.env.TEST_UPLOAD)
  tag = `COMMIT_${process.env.APPVEYOR_REPO_COMMIT}`;
else
  process.exit(0);

// Context
let paths;
const artifacts = [];

const mainTasks = [
  {
    title: 'Packaging',
    task: () => new Promise((resolve, reject) => pack((err, _paths) => {
      if(err) return reject(err);

      paths = _paths;
      return resolve();
    }, true)),
    skip: () => process.env.SKIP_PACKAGING === 'true',
  }, {
    title: 'Zipping',
    task: () => {
      const tasks = [
        {
          title: 'Creating archive with fonts',
          task: () => new Observable(ob => {
            assert(paths.length === 1);
            const p = paths[0];

            rimraf.sync(targetdir);
            fs.renameSync(p, targetdir);

            const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}.7z`;
            fs.writeFileSync(getAppDir(targetdir), fname);

            ob.next(`Writing to: ${fname}`);

            child_process
              .spawnSync('7z', ['a', '-t7z', '-m0=lzma', '-mx=9',
                                path.join(basedir, fname), targetdir]);

            artifacts.push([fname, path.join(basedir, fname), 'application/7z']);
            ob.complete();
          }),
        }, {
          title: 'Trimming fonts',
          task: () => trim(targetdir, artifacts),
        }, {
          title: 'Creating archive without fonts',
          task: () => new Observable(ob => {
            const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}-nofont.7z`;
            fs.writeFileSync(getAppDir(targetdir), fname);

            ob.next(`Writing to: ${fname}`);

            child_process
              .spawnSync('7z', ['a', '-t7z', '-m0=lzma', '-mx=9',
                                path.join(basedir, fname), targetdir]);

            artifacts.push([fname, path.join(basedir, fname), 'application/7z']);
            ob.complete();
          }),
        },
      ];

      if(runListr) return new listr(tasks);
      else return runTasks(tasks);
    },
    skip: () => process.env.SKIP_ZIPPING === 'true',
  }, {
    title: 'Uploading',
    task: () => {
      const tasks = upload(artifacts).map((p, i) => ({
        title: artifacts[i][0],
        task: () => p,
      }));

      if(runListr) return new listr(tasks, { concurrent: true });
      else return runTasks(tasks, true);
    },
  },
];

if(runListr)
  new listr(mainTasks).run().catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
else {
  const p = new Ping();
  runTasks(mainTasks).catch(e => {
    console.error(e.stack);
    process.exit(1);
  }).then(() => p.stop());
}
