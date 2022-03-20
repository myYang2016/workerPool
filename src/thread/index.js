const { parentPort } = require('worker_threads');

parentPort.postMessage('test worker');

setTimeout(function() {
  process.exit();
}, 1000);
