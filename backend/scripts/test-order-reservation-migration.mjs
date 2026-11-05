import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const url = new URL(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);
if (!process.env.DATABASE_URL_TEST && url.pathname === '/farmsight_dev') {
  url.pathname = '/farmsight_test';
}
if (url.pathname !== '/farmsight_test')
  throw new Error('Target wajib farmsight_test.');
const schema = `reservation_upgrade_${randomBytes(6).toString('hex')}`;
if (!/^reservation_upgrade_[0-9a-f]{12}$/.test(schema))
  throw new Error('Schema tidak aman.');
const client = new pg.Client({ connectionString: url.toString() });
const migrationName = '20261105070000_order_stock_reservations';
const migrationRoot = new URL('../prisma/migrations/', import.meta.url);
await client.connect();
try {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  assert.equal(
    (await client.query('SELECT current_schema() AS name')).rows[0].name,
    schema,
  );
  const entries = await readdir(migrationRoot, { withFileTypes: true });
  for (const name of entries
    .filter((entry) => entry.isDirectory() && entry.name < migrationName)
    .map((entry) => entry.name)
    .sort()) {
    await client.query(
      await readFile(new URL(`${name}/migration.sql`, migrationRoot), 'utf8'),
    );
  }
  const role = randomUUID(),
    actor = randomUUID(),
    category = randomUUID(),
    product = randomUUID();
  const order = randomUUID(),
    item = randomUUID(),
    movement = randomUUID();
  const stockOut = new Date('2026-10-28T01:00:00Z');
  await client.query(
    `INSERT INTO roles (id,code,name,updated_at) VALUES ($1,'SALES_ADMIN','Test',now())`,
    [role],
  );
  await client.query(
    `INSERT INTO users (id,name,email,email_normalized,password_hash,role_id,updated_at) VALUES ($1,'Test','migration@example.test','migration@example.test','test-only',$2,now())`,
    [actor, role],
  );
  await client.query(
    `INSERT INTO categories (id,name,name_normalized,slug,updated_at) VALUES ($1,'Test','test','test',now())`,
    [category],
  );
  await client.query(
    `INSERT INTO products (id,sku,sku_normalized,name,slug,category_id,price,updated_at) VALUES ($1,'TEST','test','Test','test',$2,1000,now())`,
    [product, category],
  );
  await client.query(
    `INSERT INTO inventory_balances (product_id,current_stock) VALUES ($1,8)`,
    [product],
  );
  await client.query(
    `INSERT INTO orders (id,public_code,source,status,customer_name,total_amount,confirmed_at,confirmed_by_user_id) VALUES ($1,'FS-UPGRADE001','INTERNAL','CONFIRMED','Test',2000,$2,$3)`,
    [order, stockOut, actor],
  );
  await client.query(
    `INSERT INTO order_items (id,order_id,product_id,snapshot_sku,snapshot_name,snapshot_unit,unit_price,quantity,subtotal_amount) VALUES ($1,$2,$3,'TEST','Test','UNIT',1000,2,2000)`,
    [item, order, product],
  );
  await client.query(
    `INSERT INTO stock_movements (id,product_id,type,action,quantity,stock_before,stock_after,reason_code,idempotency_key,payload_hash,actor_user_id,occurred_at,order_item_id) VALUES ($1,$2,'SALE_OUT','CONFIRM_ORDER',2,10,8,'SALE',$3,$4,$5,$6,$7)`,
    [movement, product, randomUUID(), 'a'.repeat(64), actor, stockOut, item],
  );

  await client.query('BEGIN');
  await client.query(
    await readFile(
      new URL(`${migrationName}/migration.sql`, migrationRoot),
      'utf8',
    ),
  );
  await client.query('COMMIT');
  const balance = (
    await client.query(
      'SELECT current_stock, reserved_stock FROM inventory_balances WHERE product_id=$1',
      [product],
    )
  ).rows[0];
  assert.equal(balance.current_stock, '8.000');
  assert.equal(balance.reserved_stock, '0.000');
  const migrated = (
    await client.query(
      'SELECT status,stock_deducted_at FROM orders WHERE id=$1',
      [order],
    )
  ).rows[0];
  assert.equal(migrated.status, 'CONFIRMED');
  assert.equal(
    migrated.stock_deducted_at.toISOString(),
    stockOut.toISOString(),
  );
  assert.equal(
    (await client.query('SELECT COUNT(*)::int AS count FROM stock_movements'))
      .rows[0].count,
    1,
  );
  for (const invalidReserved of [-1, 9]) {
    await assert.rejects(
      client.query(
        'UPDATE inventory_balances SET reserved_stock=$1 WHERE product_id=$2',
        [invalidReserved, product],
      ),
      (error) => error.code === '23514',
    );
  }
  console.log(
    'Reservation upgrade passed: physical stock and legacy movement preserved; invalid reservations rejected.',
  );
} finally {
  await client.query('ROLLBACK');
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
