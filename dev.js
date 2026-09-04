require('dotenv').config();
const {spawn} = require('child_process');
const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  env: process.env,
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});
child.on('exit', (code) => { console.log('exited with code', code); });
process.on('SIGINT', () => child.kill());
