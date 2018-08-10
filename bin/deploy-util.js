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

function getAppDir(targetdir) {
  if(os.platform() === 'darwin')
    return path.join(targetdir, 'Console Lite.app', 'Contents', 'Resources', 'app');
  else
    return path.join(targetdir, 'resources', 'app');
}

function trim(targetdir) {
  const fontbase = path.join(getAppDir(targetdir), 'fonts');

  rimraf.sync(path.join(fontbase, 'NotoSansCJKsc-*'));
  rimraf.sync(path.join(fontbase, 'Roboto-*'));
}

function _taskToPromise(task) {
  const inst = task();
  if(!inst) return Promise.resolve();
  else if(inst.subscribe) return new Promise((resolve, reject) => {
    inst.subscribe({
      next: data => console.log(data),
      error: reject,
      complete: resolve,
    });
  });
  else if(inst.then) return inst;
  else return Promise.resolve(); // Sync method
}

function runTasks(tasks, concurrent) {
  if(concurrent) {
    console.log('Running concurrently:');
    for(const { title } of tasks) console.log(` - ${title}`);

    // TODO: support skip
    return Promise.all(tasks.map(({ title, task }) => _taskToPromise(task).then(() => {
      console.log(`Completed: ${title}`);
    })));
  } else
    return tasks.reduce((prev, { title, task, skip }) => prev.then(() => {
      if(skip && skip()) return console.log(`Skipped: ${title}`);

      console.log(`Running: ${title}`);
      return _taskToPromise(task).then(() => {
        console.log(`Completed: ${title}`);
      });
    }), Promise.resolve());
}

class Ping {
  constructor() {
    this.intervalId = setInterval(() => {
      console.log('PING');
    }, 1000 * 60);
  }

  stop() {
    clearInterval(this.intervalId);
  }
}

module.exports = {
  upload,
  trim,
  runTasks,
  Ping,
  getAppDir,
};
