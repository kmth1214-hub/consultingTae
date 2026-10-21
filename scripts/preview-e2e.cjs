const { spawn } = require('node:child_process');
const { build } = require('vite');

(async () => {
  await build();
  const server = spawn(process.execPath, [
    './node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4180', '--strictPort'
  ], { stdio: 'inherit', windowsHide: true });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.kill(signal));
  }
  server.on('error', error => { console.error(error); process.exitCode = 1; });
  server.on('exit', (code, signal) => { process.exit(signal ? 1 : (code ?? 0)); });
})().catch(error => { console.error(error); process.exitCode = 1; });
