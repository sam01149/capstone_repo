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
    const [, staff] = await Promise.all([
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
      prisma.user.create({
        data: {
          name: 'Stock Test',
          email: 'stock@example.test',
          emailNormalized: 'stock@example.test',
          passwordHash: await passwords.hash('StockPassword123'),
          roleId: stockRole.id,
        },
      }),
    ]);
    staffId = staff.id;
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

  it('menegakkan login, refresh, CSRF, ganti password, dan logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'STAFF@example.test', password: 'StaffPassword123' })
      .expect(200);
    let csrf = login.body.data.csrfToken as string;
    expect(login.body.data.user).toMatchObject({
      id: staffId,
      role: 'SALES_ADMIN',
      mustChangePassword: false,
    });
    expect(login.body.data.user).not.toHaveProperty('sessionId');

    const originalCookies = (login.headers['set-cookie'] as unknown as string[])
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');
    const refreshed = await agent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', csrf)
      .expect(200);
    csrf = refreshed.body.data.csrfToken as string;
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookies)
      .set('x-csrf-token', login.body.data.csrfToken as string)
      .expect(401);
    await agent.get('/api/v1/auth/me').expect(200);
    await agent.post('/api/v1/auth/change-password').expect(403);
    await agent
      .post('/api/v1/auth/change-password')
      .set('x-csrf-token', csrf)
      .send({
        currentPassword: 'StaffPassword123',
        newPassword: 'NewPassWord12345',
      })
      .expect(200);
    await agent.get('/api/v1/auth/me').expect(401);

    const finalAgent = request.agent(app.getHttpServer());
    const finalLogin = await finalAgent
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'NewPassWord12345' })
      .expect(200);
    const finalCsrf = finalLogin.body.data.csrfToken as string;
    await finalAgent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', finalCsrf)
      .expect(200);
    await finalAgent.post('/api/v1/auth/logout').expect(200);
    await finalAgent.get('/api/v1/auth/me').expect(401);
  });

  it('menolak password baru di luar 8 sampai 16 karakter', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'StaffPassword123' })
      .expect(200);
    const csrf = login.body.data.csrfToken as string;
    await agent
      .post('/api/v1/auth/change-password')
      .set('x-csrf-token', csrf)
      .send({ currentPassword: 'StaffPassword123', newPassword: 'Pendek1' })
      .expect(400);
    await agent
      .post('/api/v1/auth/change-password')
      .set('x-csrf-token', csrf)
      .send({
        currentPassword: 'StaffPassword123',
        newPassword: 'TerlaluPanjang12345',
      })
      .expect(400);
    await agent.get('/api/v1/auth/me').expect(200);
  });

  it('menolak akun nonaktif dan access token rusak', async () => {
    await prisma.user.update({
      where: { id: staffId },
      data: { isActive: false },
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
