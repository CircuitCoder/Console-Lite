const routes = require('./routes/base');
const backend = require('./backend/main');

const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

function shutdown(cb) {
  console.log('Shuting down backend...')
  return backend.shutdown(cb);
}

module.exports = (cb, port = 4928) => {
  // Initial backend object
  backend.init((err) => {
    if(err) {
      backend.shutdown();
      cb(err);
    }

    console.log('Backend initialization completed');

    const app = express();
    app.use(bodyParser.json());

    const passkey = crypto.randomBytes(4).toString('hex');
    app.use((req, res, next) => {
      const requested = req.get('Console-Passkey');
      if(!requested || requested !== passkey) {
        if(req.method !== 'GET')
          return res.send(403);
        else
          req.consoleAuthorized = false;
      } else {
        req.consoleAuthorized = true;
      }

      next();
    });

    app.use(routes);

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.sendStatus(500);
    });

    app.listen(port, (err) => {
      if(err) {
        backend.shutdown();
        cb(err);
      } else console.log(`Server up at port ${port}.`);
    });

    cb(null, passkey, shutdown);
  });
}
