// Wrapper: load .env then run the seed-chili-oil.ts
require('dotenv').config();
const { execSync } = require('child_process');
execSync('npx tsx prisma/seed-chili-oil.ts', {
  env: process.env,
  cwd: __dirname,
  stdio: 'inherit',
});
