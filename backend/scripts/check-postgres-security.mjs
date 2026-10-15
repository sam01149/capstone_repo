import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib tersedia.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const settings = await client.query(
    `SELECT current_setting('listen_addresses') AS listen_addresses,
            current_setting('password_encryption') AS password_encryption,
            current_setting('TimeZone') AS timezone`,
  );
  let rules;
  try {
    const result = await client.query(
      `SELECT line_number, type, database, user_name, address, auth_method, error
         FROM pg_hba_file_rules
        WHERE address IN ('127.0.0.1', '::1')
           OR user_name @> ARRAY[current_user]::text[]
        ORDER BY line_number`,
    );
    rules = result.rows;
  } catch (error) {
    if (error?.code !== '42501') throw error;
    rules = 'Tidak dapat dibaca oleh role aplikasi; periksa sebagai administrator PostgreSQL.';
  }
  console.log(JSON.stringify({ settings: settings.rows[0], rules }, null, 2));
} finally {
  await client.end();
}
