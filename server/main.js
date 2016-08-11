const boot = require('./server');
const process = require('process');

let shutdownHook;

boot((err, passkey, shutdown) => {
  if(err) throw err;
  console.log(`Passkey: ${passkey}`);
  shutdownHook = shutdown;
});

function shutdown() {
  if(shutdownHook) shutdownHook(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
