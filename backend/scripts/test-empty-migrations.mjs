import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const source = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!source) throw new Error('DATABASE_URL atau DATABASE_URL_TEST wajib tersedia.');

const databaseUrl = new URL(source);
if (!process.env.DATABASE_URL_TEST) {
  if (databaseUrl.pathname !== '/farmsight_dev') {
    throw new Error('Test hanya boleh menurunkan URL dari farmsight_dev.');
  }
  databaseUrl.pathname = '/farmsight_test';
}
if (databaseUrl.pathname !== '/farmsight_test') {
  throw new Error('Migration test hanya boleh memakai farmsight_test.');
}

const schema = `plan007_empty_${randomBytes(6).toString('hex')}`;
if (!/^plan007_empty_[0-9a-f]{12}$/.test(schema)) {
  throw new Error('Nama schema sementara tidak valid.');
}
const quotedSchema = `"${schema}"`;
const pool = new pg.Pool({ connectionString: databaseUrl.toString() });

try {
  await pool.query(`CREATE SCHEMA ${quotedSchema}`);
  const migrationUrl = new URL(databaseUrl);
  migrationUrl.searchParams.set('schema', schema);
  const result = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: migrationUrl.toString() },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Deploy migration schema kosong gagal.');

  const tables = await pool.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
    [schema],
  );
  const required = [
    '_prisma_migrations',
    'audit_logs',
    'categories',
    'inventory_balances',
    'order_items',
    'order_mutations',
    'orders',
    'products',
    'roles',
    'sessions',
    'stock_movements',
    'users',
  ];
  const actual = new Set(tables.rows.map((row) => row.table_name));
  const missing = required.filter((table) => !actual.has(table));
  if (missing.length > 0) {
    throw new Error(`Tabel hasil migration tidak lengkap: ${missing.join(', ')}`);
  }
  console.log(
    JSON.stringify({
      database: 'farmsight_test',
      migrationMode: 'empty-temporary-schema',
      tableCount: tables.rowCount,
      status: 'ok',
    }),
  );
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
  await pool.end();
}
