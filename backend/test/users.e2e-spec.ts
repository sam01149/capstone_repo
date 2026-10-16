import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('FarmSight users API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;
  let adminId: string;
  let staffId: string;
  let stockId: string;
  let adminRoleId: string;

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
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_selected_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_selected_audit();',
    );
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
    adminRoleId = adminRole.id;
    const [admin, staff, stock] = await Promise.all([
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
    adminId = admin.id;
    staffId = staff.id;
    stockId = stock.id;
  });

  async function login(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return {
      agent,
      csrf: response.body.data.csrfToken as string,
      user: response.body.data.user as Record<string, unknown>,
    };
  }

  it('menutup seluruh endpoint pengguna untuk sesi tanpa izin', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    const staff = await login('staff@example.test', 'StaffPassword123');
    await staff.agent.get('/api/v1/users').expect(403);
    await staff.agent.get(`/api/v1/users/${adminId}`).expect(403);
    await staff.agent.get(`/api/v1/users/${adminId}/activity`).expect(403);
    await staff.agent
      .post('/api/v1/users')
      .set('x-csrf-token', staff.csrf)
      .send({
        name: 'Tidak Diizinkan',
        email: 'forbidden@example.test',
        role: 'SALES_ADMIN',
        password: 'Create88',
      })
      .expect(403);
    await staff.agent
      .patch(`/api/v1/users/${adminId}`)
      .set('x-csrf-token', staff.csrf)
      .send({ name: 'Tidak Diizinkan' })
      .expect(403);
    await staff.agent
      .patch(`/api/v1/users/${adminId}/role`)
      .set('x-csrf-token', staff.csrf)
      .send({ role: 'SALES_ADMIN' })
      .expect(403);
    await staff.agent
      .post(`/api/v1/users/${adminId}/deactivate`)
      .set('x-csrf-token', staff.csrf)
      .expect(403);
    await staff.agent
      .post(`/api/v1/users/${adminId}/reset-password`)
      .set('x-csrf-token', staff.csrf)
      .send({ password: 'Reset888' })
      .expect(403);
  });

  it('mengelola list, detail, create, update, dan activity tanpa membocorkan data sensitif', async () => {
    const admin = await login('admin@example.test', 'AdminPassword123');
    const list = await admin.agent
      .get('/api/v1/users?page=1&limit=2&sort=name&order=asc')
      .expect(200);
    expect(list.body.data.items).toHaveLength(2);
    expect(list.body.data.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    for (const user of list.body.data.items as Record<string, unknown>[]) {
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('passwordHash');
    }
    await admin.agent.get('/api/v1/users?limit=101').expect(400);
    await admin.agent.get('/api/v1/users?sort=passwordHash').expect(400);
    await admin.agent.get('/api/v1/users/bukan-uuid').expect(400);
    await admin.agent
      .get('/api/v1/users/00000000-0000-4000-8000-000000000000')
      .expect(404);

    const filtered = await admin.agent
      .get('/api/v1/users?search=STAFF&role=SALES_ADMIN&isActive=true')
      .expect(200);
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.items[0].id).toBe(staffId);
    const detail = await admin.agent
      .get(`/api/v1/users/${staffId}`)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      id: staffId,
      role: 'SALES_ADMIN',
      isActive: true,
      mustChangePassword: false,
    });
    expect(detail.body.data).not.toHaveProperty('passwordHash');

    for (const password of ['Pendek1', 'TerlaluPanjang12345']) {
      await admin.agent
        .post('/api/v1/users')
        .set('x-csrf-token', admin.csrf)
        .send({
          name: 'Batas Password',
          email: `${password.length}@example.test`,
          role: 'SALES_ADMIN',
          password,
        })
        .expect(400);
    }

    const created = await admin.agent
      .post('/api/v1/users')
      .set('x-csrf-token', admin.csrf)
      .send({
        name: 'Pengguna Baru',
        email: 'NEW.USER@Example.Test',
        role: 'SALES_ADMIN',
        password: 'Create88',
      })
      .expect(201);
    const createdId = created.body.data.id as string;
    expect(created.body.data).toMatchObject({
      email: 'new.user@example.test',
      mustChangePassword: false,
    });
    expect(created.body.data).not.toHaveProperty('password');

    await admin.agent
      .post('/api/v1/users')
      .set('x-csrf-token', admin.csrf)
      .send({
        name: 'Batas Enam Belas',
        email: 'sixteen@example.test',
        role: 'STOCK_MANAGER',
        password: 'SixteenChars1234',
      })
      .expect(201);
    const duplicate = await admin.agent
      .post('/api/v1/users')
      .set('x-csrf-token', admin.csrf)
      .send({
        name: 'Duplikat',
        email: ' New.User@example.test ',
        role: 'SALES_ADMIN',
        password: 'Create88',
      })
      .expect(409);
    expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_USED');

    await admin.agent
      .patch(`/api/v1/users/${createdId}`)
      .set('x-csrf-token', admin.csrf)
      .send({})
      .expect(400);
    await admin.agent
      .patch(`/api/v1/users/${createdId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ role: 'SUPER_ADMIN' })
      .expect(400);
    const updated = await admin.agent
      .patch(`/api/v1/users/${createdId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'Nama Diperbarui', email: 'updated@example.test' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      name: 'Nama Diperbarui',
      email: 'updated@example.test',
    });
    const conflict = await admin.agent
      .patch(`/api/v1/users/${createdId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ email: 'STAFF@example.test' })
      .expect(409);
    expect(conflict.body.error.code).toBe('EMAIL_ALREADY_USED');

    const activity = await admin.agent
      .get(`/api/v1/users/${createdId}/activity?page=1&limit=10`)
      .expect(200);
    expect(
      activity.body.data.items.map((item: { action: string }) => item.action),
    ).toEqual(expect.arrayContaining(['USER_CREATED', 'USER_UPDATED']));
    expect(JSON.stringify(activity.body)).not.toContain('Create88');
    expect(JSON.stringify(activity.body)).not.toContain('passwordHash');
    const updateOnly = await admin.agent
      .get(`/api/v1/users/${createdId}/activity?action=USER_UPDATED`)
      .expect(200);
    expect(updateOnly.body.data.items).toHaveLength(1);
    expect(updateOnly.body.data.items[0].metadata).toEqual({
      changedFields: ['name', 'email'],
    });
    const invalidRange = await admin.agent
      .get(
        `/api/v1/users/${createdId}/activity?from=2026-10-17T00:00:00.000Z&to=2026-10-16T00:00:00.000Z`,
      )
      .expect(400);
    expect(invalidRange.body.error.code).toBe('INVALID_DATE_RANGE');
  });

  it('mencabut sesi pada perubahan role/deaktivasi dan melindungi Super Admin terakhir', async () => {
    const admin = await login('admin@example.test', 'AdminPassword123');
    const staff = await login('staff@example.test', 'StaffPassword123');
    const stock = await login('stock@example.test', 'StockPassword123');

    const roleChanged = await admin.agent
      .patch(`/api/v1/users/${staffId}/role`)
      .set('x-csrf-token', admin.csrf)
      .send({ role: 'STOCK_MANAGER' })
      .expect(200);
    expect(roleChanged.body.data.role).toBe('STOCK_MANAGER');
    await staff.agent.get('/api/v1/auth/me').expect(401);

    const deactivated = await admin.agent
      .post(`/api/v1/users/${stockId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    expect(deactivated.body.data.isActive).toBe(false);
    await admin.agent
      .post(`/api/v1/users/${stockId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    await stock.agent.get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'stock@example.test', password: 'StockPassword123' })
      .expect(401);
    await admin.agent
      .post(`/api/v1/users/${stockId}/reset-password`)
      .set('x-csrf-token', admin.csrf)
      .send({ password: 'Reset888' })
      .expect(404);

    const demoteLast = await admin.agent
      .patch(`/api/v1/users/${adminId}/role`)
      .set('x-csrf-token', admin.csrf)
      .send({ role: 'SALES_ADMIN' })
      .expect(409);
    expect(demoteLast.body.error.code).toBe('LAST_SUPER_ADMIN_REQUIRED');
    const deactivateLast = await admin.agent
      .post(`/api/v1/users/${adminId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(409);
    expect(deactivateLast.body.error.code).toBe('LAST_SUPER_ADMIN_REQUIRED');
  });

  it('menjaga minimal satu Super Admin pada dua request concurrent', async () => {
    const second = await prisma.user.create({
      data: {
        name: 'Admin Kedua',
        email: 'admin2@example.test',
        emailNormalized: 'admin2@example.test',
        passwordHash: await passwords.hash('AdminPassword456'),
        roleId: adminRoleId,
      },
    });
    const firstLogin = await login('admin@example.test', 'AdminPassword123');
    const secondLogin = await login('admin2@example.test', 'AdminPassword456');

    const [firstResult, secondResult] = await Promise.all([
      firstLogin.agent
        .patch(`/api/v1/users/${second.id}/role`)
        .set('x-csrf-token', firstLogin.csrf)
        .send({ role: 'SALES_ADMIN' }),
      secondLogin.agent
        .patch(`/api/v1/users/${adminId}/role`)
        .set('x-csrf-token', secondLogin.csrf)
        .send({ role: 'SALES_ADMIN' }),
    ]);
    expect(
      [firstResult.status, secondResult.status].filter((x) => x === 200),
    ).toHaveLength(1);
    expect([401, 409]).toContain(
      [firstResult.status, secondResult.status].find((x) => x !== 200),
    );
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        role: { code: 'SUPER_ADMIN' },
      },
    });
    expect(activeAdmins).toBe(1);
  });

  it('mereset password tanpa expiry dan tanpa memblokir akses berdasarkan mustChangePassword', async () => {
    const staff = await login('staff@example.test', 'StaffPassword123');
    const admin = await login('admin@example.test', 'AdminPassword123');
    for (const password of ['Pendek1', 'TerlaluPanjang12345']) {
      await admin.agent
        .post(`/api/v1/users/${staffId}/reset-password`)
        .set('x-csrf-token', admin.csrf)
        .send({ password })
        .expect(400);
    }

    const reset = await admin.agent
      .post(`/api/v1/users/${staffId}/reset-password`)
      .set('x-csrf-token', admin.csrf)
      .send({ password: 'Reset888' })
      .expect(200);
    expect(reset.body.data).toMatchObject({
      passwordReset: true,
      user: { id: staffId, mustChangePassword: true },
    });
    expect(reset.body.data).not.toHaveProperty('password');
    expect(reset.body.data).not.toHaveProperty('temporaryPassword');
    expect(reset.body.data).not.toHaveProperty('expiresAt');
    await staff.agent.get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.test', password: 'StaffPassword123' })
      .expect(401);

    const resetLogin = await login('staff@example.test', 'Reset888');
    expect(resetLogin.user.mustChangePassword).toBe(true);
    expect(resetLogin.user.passwordChangedAt).toEqual(expect.any(String));
    await resetLogin.agent.get('/api/v1/auth/me').expect(200);
    const refreshed = await resetLogin.agent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', resetLogin.csrf)
      .expect(200);
    expect(refreshed.body.data.user.mustChangePassword).toBe(true);
    await resetLogin.agent.get('/api/v1/users').expect(403);
    await resetLogin.agent
      .post('/api/v1/auth/change-password')
      .set('x-csrf-token', refreshed.body.data.csrfToken as string)
      .send({ currentPassword: 'Reset888', newPassword: 'Final888' })
      .expect(200);

    const finalLogin = await login('staff@example.test', 'Final888');
    expect(finalLogin.user.mustChangePassword).toBe(false);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: { passwordHash: true, mustChangePassword: true },
    });
    expect(stored.passwordHash).not.toContain('Final888');
    expect(stored.mustChangePassword).toBe(false);
  });

  it('melakukan rollback penuh bila audit mutation gagal', async () => {
    const admin = await login('admin@example.test', 'AdminPassword123');
    const staff = await login('staff@example.test', 'StaffPassword123');
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: {
        name: true,
        roleId: true,
        isActive: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_selected_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action IN ('USER_CREATED', 'USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'AUTH_PASSWORD_RESET') THEN
          RAISE EXCEPTION 'forced audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_selected_audit_trigger
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_selected_audit();
    `);

    try {
      await admin.agent
        .post('/api/v1/users')
        .set('x-csrf-token', admin.csrf)
        .send({
          name: 'Harus Rollback',
          email: 'rollback@example.test',
          role: 'SALES_ADMIN',
          password: 'Create88',
        })
        .expect(500);
      await admin.agent
        .patch(`/api/v1/users/${staffId}`)
        .set('x-csrf-token', admin.csrf)
        .send({ name: 'Nama Gagal' })
        .expect(500);
      await admin.agent
        .patch(`/api/v1/users/${staffId}/role`)
        .set('x-csrf-token', admin.csrf)
        .send({ role: 'STOCK_MANAGER' })
        .expect(500);
      await admin.agent
        .post(`/api/v1/users/${staffId}/deactivate`)
        .set('x-csrf-token', admin.csrf)
        .expect(500);
      await admin.agent
        .post(`/api/v1/users/${staffId}/reset-password`)
        .set('x-csrf-token', admin.csrf)
        .send({ password: 'Reset888' })
        .expect(500);

      expect(
        await prisma.user.findUniqueOrThrow({
          where: { id: staffId },
          select: {
            name: true,
            roleId: true,
            isActive: true,
            passwordHash: true,
            mustChangePassword: true,
          },
        }),
      ).toEqual(before);
      expect(
        await prisma.user.findUnique({
          where: { emailNormalized: 'rollback@example.test' },
        }),
      ).toBeNull();
      await staff.agent.get('/api/v1/auth/me').expect(200);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_selected_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_selected_audit();',
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });
});
