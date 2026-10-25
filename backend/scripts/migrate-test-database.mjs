import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!source) throw new Error('DATABASE_URL atau DATABASE_URL_TEST wajib tersedia.');
const testUrl = new URL(source);
if (!process.env.DATABASE_URL_TEST) {
  if (testUrl.pathname !== '/farmsight_dev') {
    throw new Error('Migrasi test hanya boleh diturunkan dari farmsight_dev.');
  }
  testUrl.pathname = '/farmsight_test';
}
if (testUrl.pathname !== '/farmsight_test') {
  throw new Error('Target migrasi wajib database farmsight_test.');
}

const prismaCli = fileURLToPath(
  new URL('../node_modules/prisma/build/index.js', import.meta.url),
);
const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testUrl.toString() },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
