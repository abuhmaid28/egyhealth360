import { spawn } from 'node:child_process';
const commands = [
  ['--filter', '@egyhealth/web', 'dev'],
  ['--filter', '@egyhealth/api', 'dev'],
  ['--filter', '@egyhealth/experiment-worker', 'dev'],
  ['-r', '--parallel', '--filter', '!@egyhealth/web', 'exec', 'tsc', '-p', 'tsconfig.json', '--watch'],
];
const children = commands.map(args => spawn('pnpm', args, { stdio: 'inherit', env: process.env }));
let stopping = false;
function stop() { if (stopping) return; stopping = true; children.forEach(child => child.kill('SIGTERM')); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
children.forEach(child => {
  child.on('error', () => { process.exitCode = 1; stop(); });
  child.on('exit', code => { if (!stopping) { process.exitCode = code || 1; stop(); } });
});
