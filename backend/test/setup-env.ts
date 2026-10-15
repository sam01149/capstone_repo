import 'dotenv/config';

const source = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
if (!source)
  throw new Error('DATABASE_URL atau DATABASE_URL_TEST wajib tersedia.');
const testUrl = new URL(source);
if (!process.env.DATABASE_URL_TEST) {
  if (testUrl.pathname !== '/farmsight_dev') {
    throw new Error(
      'Test hanya boleh menurunkan URL dari database farmsight_dev.',
    );
  }
  testUrl.pathname = '/farmsight_test';
}
if (testUrl.pathname !== '/farmsight_test') {
  throw new Error('E2E hanya boleh berjalan pada database farmsight_test.');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testUrl.toString();
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.JWT_ACCESS_SECRET = 'test-jwt-secret-'.padEnd(64, 'j');
process.env.PASSWORD_PEPPER = 'test-password-pepper-'.padEnd(32, 'p');
process.env.SESSION_TOKEN_PEPPER = 'test-token-pepper-'.padEnd(32, 's');
process.env.ACCESS_TOKEN_TTL_SECONDS = '900';
process.env.SESSION_IDLE_TTL_SECONDS = '7200';
process.env.SESSION_ABSOLUTE_TTL_SECONDS = '43200';
process.env.TEMP_PASSWORD_TTL_SECONDS = '86400';
