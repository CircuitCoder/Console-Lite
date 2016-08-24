const boot = require('./server');
if(!process) process = require('process');

let shutdownHook;

boot((err, passkey, idkey, shutdown) => {
  if(err) throw err;
  shutdownHook = shutdown;
});

function shutdown() {
  if(shutdownHook) shutdownHook(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
