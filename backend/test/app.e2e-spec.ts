import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('FarmSight auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;
  let adminId: string;
  let staffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.init();
    prisma = app.get(PrismaService);
    passwords = app.get(PasswordService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    const [adminRole, salesRole, stockRole] = await Promise.all([
      prisma.role.create({
        data: { code: 'SUPER_ADMIN', name: 'Super Admin' },
      }),
      prisma.role.create({
        data: { code: 'SALES_ADMIN', name: 'Sales Admin' },
      }),
      prisma.role.create({
        data: { code: 'STOCK_MANAGER', name: 'Stock Manager' },
      }),
    ]);
    const [admin, staff] = await Promise.all([
      prisma.user.create({
        data: {
          name: 'Admin Test',
          email: 'admin@example.test',
          emailNormalized: 'admin@example.test',
          passwordHash: await passwords.hash('AdminPassword123'),
          roleId: adminRole.id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Staff Test',
          email: 'staff@example.test',
          emailNormalized: 'staff@example.test',
          passwordHash: await passwords.hash('StaffPassword123'),
          roleId: salesRole.id,
        },
      }),
    ]);
    adminId = admin.id;
    staffId = staff.id;
    await prisma.user.create({
      data: {
        name: 'Stock Test',
        email: 'stock@example.test',
        emailNormalized: 'stock@example.test',
        passwordHash: await passwords.hash('StockPassword123'),
        roleId: stockRole.id,
      },
    });
  });

  it('health tetap publik dengan envelope dan request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toMatchObject({
      data: { status: 'ok', database: 'up' },
      meta: { requestId: expect.any(String) },
    });
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('memberi error login generik untuk email tidak ada dan password salah', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.test', password: 'WrongPassword123' })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'WrongPassword123' })
      .expect(401);
    expect(missing.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email atau password tidak valid.',
    });
    expect(wrong.body.error).toMatchObject(missing.body.error);
  });

  it('mengembalikan role Stock Manager yang berlaku', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'stock@example.test', password: 'StockPassword123' })
      .expect(200);
    expect(response.body.data.user.role).toBe('STOCK_MANAGER');
  });

  it('menegakkan login, RBAC, reset, ganti password, revocation, dan logout', async () => {
    const staffAgent = request.agent(app.getHttpServer());
    const staffLogin = await staffAgent
      .post('/api/v1/auth/login')
      .send({ email: 'STAFF@example.test', password: 'StaffPassword123' })
      .expect(200);
    let staffCsrf = staffLogin.body.data.csrfToken as string;
    expect(staffLogin.body.data.user).toMatchObject({
      id: staffId,
      role: 'SALES_ADMIN',
      mustChangePassword: false,
    });
    expect(staffLogin.body.data.user).not.toHaveProperty('sessionId');
    const originalCookies = (
      staffLogin.headers['set-cookie'] as unknown as string[]
    )
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');
    const refreshed = await staffAgent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', staffCsrf)
      .expect(200);
    staffCsrf = refreshed.body.data.csrfToken as string;
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookies)
      .set('x-csrf-token', staffLogin.body.data.csrfToken as string)
      .expect(401);
    await staffAgent.get('/api/v1/auth/me').expect(200);
    await staffAgent
      .post(`/api/v1/users/${adminId}/reset-password`)
      .set('x-csrf-token', staffCsrf)
      .expect(403);

    const adminAgent = request.agent(app.getHttpServer());
    const adminLogin = await adminAgent
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.test', password: 'AdminPassword123' })
      .expect(200);
    const adminCsrf = adminLogin.body.data.csrfToken as string;
    await adminAgent
      .post(`/api/v1/users/${staffId}/reset-password`)
      .expect(403);
    const reset = await adminAgent
      .post(`/api/v1/users/${staffId}/reset-password`)
      .set('x-csrf-token', adminCsrf)
      .expect(200);
    const temporaryPassword = reset.body.data.temporaryPassword as string;
    expect(temporaryPassword).toHaveLength(16);
    expect(reset.body.data.expiresAt).toEqual(expect.any(String));
    await staffAgent.get('/api/v1/auth/me').expect(401);

    const temporaryAgent = request.agent(app.getHttpServer());
    const temporaryLogin = await temporaryAgent
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: temporaryPassword })
      .expect(200);
    const temporaryCsrf = temporaryLogin.body.data.csrfToken as string;
    expect(temporaryLogin.body.data.user.mustChangePassword).toBe(true);
    await temporaryAgent.get('/api/v1/auth/me').expect(403);
    await temporaryAgent
      .post('/api/v1/auth/change-password')
      .set('x-csrf-token', temporaryCsrf)
      .send({
        currentPassword: temporaryPassword,
        newPassword: 'NewStaffPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: temporaryPassword })
      .expect(401);
    const finalAgent = request.agent(app.getHttpServer());
    const finalLogin = await finalAgent
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'NewStaffPassword123' })
      .expect(200);
    const finalCsrf = finalLogin.body.data.csrfToken as string;
    await finalAgent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', finalCsrf)
      .expect(200);
    await finalAgent.post('/api/v1/auth/logout').expect(200);
    await finalAgent.get('/api/v1/auth/me').expect(401);
  });

  it('menolak akun nonaktif, password sementara kedaluwarsa, dan token rusak', async () => {
    await prisma.user.update({
      where: { id: staffId },
      data: { isActive: false },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'StaffPassword123' })
      .expect(401);
    await prisma.user.update({
      where: { id: staffId },
      data: {
        isActive: true,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: new Date(Date.now() - 1_000),
      },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'StaffPassword123' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', 'farmsight_access=not-a-jwt')
      .expect(401);
  });

  it('melakukan rollback reset bila penulisan audit gagal', async () => {
    const staffAgent = request.agent(app.getHttpServer());
    await staffAgent
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'StaffPassword123' })
      .expect(200);
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: { passwordHash: true },
    });
    const adminAgent = request.agent(app.getHttpServer());
    const login = await adminAgent
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.test', password: 'AdminPassword123' })
      .expect(200);
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_auth_reset_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'AUTH_PASSWORD_RESET' THEN
          RAISE EXCEPTION 'forced audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_auth_reset_audit_trigger
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_auth_reset_audit();
    `);
    try {
      const failed = await adminAgent
        .post(`/api/v1/users/${staffId}/reset-password`)
        .set('x-csrf-token', login.body.data.csrfToken as string)
        .expect(500);
      expect(failed.body.error.code).toBe('INTERNAL_ERROR');
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: staffId },
        select: { passwordHash: true, mustChangePassword: true },
      });
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(after.mustChangePassword).toBe(false);
      await staffAgent.get('/api/v1/auth/me').expect(200);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_auth_reset_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_auth_reset_audit();',
      );
    }
  });

  it('membatasi percobaan login berulang', async () => {
    let rateLimited = false;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'missing@example.test', password: 'WrongPassword123' });
      if (response.status === 429) {
        rateLimited = true;
        expect(response.body.error.code).toBe('RATE_LIMITED');
        break;
      }
    }
    expect(rateLimited).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
