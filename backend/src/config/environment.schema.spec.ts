import { validateEnvironment } from './environment.schema.js';

describe('validateEnvironment', () => {
  const required = {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/farmsight',
    FRONTEND_ORIGIN: 'http://localhost:5173',
    JWT_ACCESS_SECRET: 'j'.repeat(64),
    PASSWORD_PEPPER: 'p'.repeat(32),
    SESSION_TOKEN_PEPPER: 's'.repeat(32),
  };

  it('memberi nilai default untuk konfigurasi opsional', () => {
    const result = validateEnvironment({
      ...required,
    });

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_POOL_MAX: 10,
      DATABASE_CONNECTION_TIMEOUT_MS: 5000,
      DATABASE_SSL: false,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      SESSION_IDLE_TTL_SECONDS: 7200,
      SESSION_ABSOLUTE_TTL_SECONDS: 43200,
      TEMP_PASSWORD_TTL_SECONDS: 86400,
    });
  });

  it('mengonversi nilai environment bertipe string', () => {
    const result = validateEnvironment({
      ...required,
      PORT: '3100',
      DATABASE_POOL_MAX: '5',
      DATABASE_CONNECTION_TIMEOUT_MS: '3000',
      DATABASE_SSL: 'true',
    });

    expect(result).toMatchObject({
      PORT: 3100,
      DATABASE_POOL_MAX: 5,
      DATABASE_CONNECTION_TIMEOUT_MS: 3000,
      DATABASE_SSL: true,
    });
  });

  it('menolak konfigurasi wajib yang hilang atau tidak aman', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'http://localhost/database',
        DATABASE_POOL_MAX: 100,
      }),
    ).toThrow('Konfigurasi environment tidak valid');
  });

  it('mewajibkan secure cookie pada production', () => {
    expect(() =>
      validateEnvironment({
        ...required,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow('COOKIE_SECURE wajib true');
  });
});
