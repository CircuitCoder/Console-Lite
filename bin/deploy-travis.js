const pack = require('./pack');
const { upload, trim, runTasks, Ping, getAppDir } = require('./deploy-util');

const assert = require('assert');
const fs = require('fs');
const fstream = require('fstream');
const listr = require('listr');
const os = require('os');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');
const tar = require('tar');
const zlib = require('zlib');

const { Observable } = require('rxjs/Observable');

let tag;

if(process.env.TRAVIS_TAG && /^v\d+\.\d+\.\d+/.test(process.env.TRAVIS_TAG))
  tag = process.env.TRAVIS_TAG;
else if(process.env.TEST_UPLOAD)
  tag = `COMMIT_${process.env.TRAVIS_COMMIT}`;
else
  process.exit(0);

// Context
let paths = [path.join(__dirname, '..', 'Console Lite')];
const artifacts = [];

const gzipOpt = {
  memLevel: 9,
  level: 9,
};

const basedir = path.dirname(__dirname);
const targetdir = path.join(basedir, 'Console Lite');

const runListr = process.env.RUN_LISTR === 'true';

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

            if(p !== targetdir) {
              rimraf.sync(targetdir);
              fs.renameSync(p, targetdir);
            }

            const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}.tar.gz`;
            fs.writeFileSync(path.join(getAppDir(targetdir), 'VERSION'), fname);

            ob.next(`Writing to: ${fname}`);

            fstream.Reader({
              path: targetdir,
              type: 'Directory',
            })
            .pipe(tar.Pack())
            .pipe(zlib.createGzip(gzipOpt))
            .pipe(fs.createWriteStream(path.join(basedir, fname)))
            .on('finish', () => {
              artifacts.push([fname, path.join(basedir, fname), 'application/7z']);
              ob.complete();
            })
            .on('error', err => ob.error(err));
          }),
        }, {
          title: 'Trimming fonts',
          task: () => trim(targetdir, artifacts),
        }, {
          title: 'Creating archive without fonts',
          task: () => new Observable(ob => {
            const fname = `Console-Lite-${tag}-${os.platform()}-${os.arch()}-nofont.tar.gz`;
            fs.writeFileSync(path.join(getAppDir(targetdir), 'VERSION'), fname);

            ob.next(`Writing to: ${fname}`);

            fstream.Reader({
              path: targetdir,
              type: 'Directory',
            })
            .pipe(tar.Pack())
            .pipe(zlib.createGzip(gzipOpt))
            .pipe(fs.createWriteStream(path.join(basedir, fname)))
            .on('finish', () => {
              artifacts.push([
                fname, path.join(basedir, fname),
                'application/tar+gzip',
              ]);
              ob.complete();
            })
            .on('error', err => ob.error(err));
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
