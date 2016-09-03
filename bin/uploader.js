/* eslint-disable new-cap */

const minio = require('minio');
const process = require('process');

module.exports = (artifacts) => {
  const mc = new minio({
    endPoint: 'store.bjmun.org',
    secure: true,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  });

  return Promise.all(artifacts.map(([name, dir, mime]) => new Promise((resolve, reject) => {
    mc.fPutObject('console-lite', name, dir, mime,
                  (err, etag) => err ? reject(err) : resolve([name, dir, etag]));
  })));
};
