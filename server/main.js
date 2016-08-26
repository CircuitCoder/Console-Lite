const boot = require('./server');

let _process = process;
if(_process === undefined) _process = require('process'); // eslint-disable-line global-require

let shutdownHook;

boot((err, passkey, idkey, sd) => {
  if(err) throw err;
  shutdownHook = sd;
});

function shutdown() {
  if(shutdownHook) shutdownHook(() => process.exit(0));
}

_process.on('SIGINT', shutdown);
_process.on('SIGTERM', shutdown);
