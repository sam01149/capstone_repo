import { randomUUID } from 'node:crypto';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('FarmSight order and public catalog API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;
  let productId: string;

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
    await prisma.orderMutation.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventoryBalance.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
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
    await Promise.all([
      prisma.user.create({
        data: {
          name: 'Admin Order',
          email: 'admin.orders@example.test',
          emailNormalized: 'admin.orders@example.test',
          passwordHash: await passwords.hash('AdminPassword123'),
          roleId: adminRole.id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Sales Order',
          email: 'sales.orders@example.test',
          emailNormalized: 'sales.orders@example.test',
          passwordHash: await passwords.hash('SalesPassword123'),
          roleId: salesRole.id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Stock Order',
          email: 'stock.orders@example.test',
          emailNormalized: 'stock.orders@example.test',
          passwordHash: await passwords.hash('StockPassword123'),
          roleId: stockRole.id,
        },
      }),
    ]);
    const category = await prisma.category.create({
      data: { name: 'Pupuk', nameNormalized: 'pupuk', slug: 'pupuk' },
    });
    const product = await prisma.product.create({
      data: {
        sku: 'NPK-ORDER-01',
        skuNormalized: 'npk-order-01',
        name: 'Pupuk NPK Order',
        slug: 'pupuk-npk-order',
        categoryId: category.id,
        price: 25_000,
        reorderPoint: '3',
        stockUnit: 'KG',
        inventoryBalance: { create: { currentStock: '10' } },
      },
    });
    productId = product.id;
  });

  async function login(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { agent, csrf: response.body.data.csrfToken as string };
  }

  const items = (quantity = '2') => [{ productId, quantity }];

  async function createInternal(
    actor: Awaited<ReturnType<typeof login>>,
    quantity = '2',
  ) {
    return actor.agent
      .post('/api/v1/orders')
      .set('x-csrf-token', actor.csrf)
      .set('idempotency-key', randomUUID())
      .send({ customerName: 'Pelanggan Internal', items: items(quantity) })
      .expect(201);
  }

  async function transition(
    actor: Awaited<ReturnType<typeof login>>,
    orderId: string,
    action: string,
    expected = 201,
  ) {
    return actor.agent
      .post(`/api/v1/orders/${orderId}/transition`)
      .set('x-csrf-token', actor.csrf)
      .set('idempotency-key', randomUUID())
      .send({ action })
      .expect(expected);
  }

  it('membuka katalog aktif tanpa login dan menyembunyikan jumlah stok persis', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/public/products')
      .expect(200);
    expect(list.body.data.items[0]).toMatchObject({
      id: productId,
      availability: 'AVAILABLE',
      price: 25_000,
      stockUnit: 'KG',
    });
    expect(list.body.data.items[0]).not.toHaveProperty('currentStock');

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
    await request(app.getHttpServer())
      .get('/api/v1/public/products/pupuk-npk-order')
      .expect(404);
  });

  it('membuat satu draft publik idempoten dan menghasilkan tautan WhatsApp', async () => {
    const key = randomUUID();
    const payload = {
      customerName: '  Ibu Sari  ',
      customerPhone: '0812 3456 7890',
      items: items('1.5'),
    };
    const concurrent = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/public/order-drafts')
        .set('idempotency-key', key)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/v1/public/order-drafts')
        .set('idempotency-key', key)
        .send(payload),
    ]);
    expect(concurrent.map((response) => response.status)).toEqual([201, 201]);
    const first = concurrent[0];
    const replay = await request(app.getHttpServer())
      .post('/api/v1/public/order-drafts')
      .set('idempotency-key', key)
      .send(payload)
      .expect(201);

    expect(first.body.data).toMatchObject({
      publicCode: expect.stringMatching(/^FS-[0-9A-F]{10}$/),
      source: 'PUBLIC_WHATSAPP',
      status: 'DRAFT',
      totalAmount: 37_500,
      currency: 'IDR',
      whatsappUrl: expect.stringContaining('https://wa.me/6281234567890?text='),
    });
    expect(replay.body.data.publicCode).toBe(first.body.data.publicCode);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.orderMutation.count()).toBe(1);
    expect(new Date(first.body.data.expiresAt).getTime()).toBeGreaterThan(
      Date.now() + 23 * 60 * 60 * 1000,
    );

    await request(app.getHttpServer())
      .post('/api/v1/public/order-drafts')
      .set('idempotency-key', randomUUID())
      .send({ customerName: 'Tanpa Nomor', items: items() })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/public/order-drafts')
      .set('idempotency-key', randomUUID())
      .send({ ...payload, totalAmount: 1, whatsappNumber: '62000000000' })
      .expect(400);
  });

  it('membatasi order ke Sales/Super Admin serta mengaudit koreksi pelanggan', async () => {
    await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    await stock.agent.get('/api/v1/orders').expect(403);
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const created = await createInternal(sales);
    const orderId = created.body.data.id as string;
    expect(created.body.data.customer).toMatchObject({
      name: 'Pelanggan Internal',
      phone: null,
    });

    const updated = await sales.agent
      .patch(`/api/v1/orders/${orderId}`)
      .set('x-csrf-token', sales.csrf)
      .set('idempotency-key', randomUUID())
      .send({ customerName: 'Nama Dikoreksi', customerPhone: '081234567890' })
      .expect(200);
    expect(updated.body.data.customer).toMatchObject({
      name: 'Nama Dikoreksi',
      phone: '081234567890',
    });
    expect(
      await prisma.auditLog.count({
        where: { action: 'ORDER_UPDATED', targetId: orderId },
      }),
    ).toBe(1);
    await sales.agent
      .patch(`/api/v1/orders/${orderId}`)
      .set('x-csrf-token', sales.csrf)
      .set('idempotency-key', randomUUID())
      .send({})
      .expect(400);
    await sales.agent
      .get(
        '/api/v1/orders?createdFrom=2026-10-28T00:00:00.000Z&createdTo=2026-10-27T00:00:00.000Z',
      )
      .expect(400);
  });

  it('mengurangi stok tepat sekali ketika order dikonfirmasi', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const created = await createInternal(sales, '2.5');
    const orderId = created.body.data.id as string;
    await transition(sales, orderId, 'SUBMIT');

    const key = randomUUID();
    const confirm = () =>
      sales.agent
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', key)
        .send({ action: 'CONFIRM' });
    const first = await confirm().expect(201);
    const replay = await confirm().expect(201);
    expect(first.body.data.status).toBe('CONFIRMED');
    expect(replay.body.data.status).toBe('CONFIRMED');

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('7.500');
    expect(
      await prisma.stockMovement.count({
        where: { referenceId: orderId, type: 'SALE_OUT' },
      }),
    ).toBe(1);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'ORDER_CONFIRM', targetId: orderId },
    });
    expect(audit.safeMetadata).toEqual({
      from: 'PENDING_CONFIRMATION',
      to: 'CONFIRMED',
    });
    await sales.agent
      .patch(`/api/v1/orders/${orderId}`)
      .set('x-csrf-token', sales.csrf)
      .set('idempotency-key', randomUUID())
      .send({ customerName: 'Tidak Boleh' })
      .expect(409);
    await transition(sales, orderId, 'CANCEL', 409);
    await transition(sales, orderId, 'COMPLETE');
    await transition(sales, orderId, 'COMPLETE', 409);
    expect(await prisma.stockMovement.count()).toBe(1);
  });

  it('menolak stok kurang tanpa efek parsial dan mengunci persaingan konfirmasi', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const tooLarge = await createInternal(sales, '11');
    const tooLargeId = tooLarge.body.data.id as string;
    await transition(sales, tooLargeId, 'SUBMIT');
    const rejected = await transition(sales, tooLargeId, 'CONFIRM', 409);
    expect(rejected.body.error.code).toBe('ORDER_STOCK_INSUFFICIENT');
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).currentStock.toFixed(3),
    ).toBe('10.000');
    expect(await prisma.stockMovement.count()).toBe(0);
    expect(
      await prisma.auditLog.count({
        where: { action: 'ORDER_CONFIRM_REJECTED', targetId: tooLargeId },
      }),
    ).toBe(1);

    const first = await createInternal(sales, '7');
    const second = await createInternal(sales, '7');
    await transition(sales, first.body.data.id, 'SUBMIT');
    await transition(sales, second.body.data.id, 'SUBMIT');
    const confirmConcurrent = (orderId: string) =>
      sales.agent
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', randomUUID())
        .send({ action: 'CONFIRM' });
    const results = await Promise.all([
      confirmConcurrent(first.body.data.id),
      confirmConcurrent(second.body.data.id),
    ]);
    expect(
      results.map((result) => result.status).sort(),
      JSON.stringify(results.map((result) => result.body)),
    ).toEqual([201, 409]);
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).currentStock.toFixed(3),
    ).toBe('3.000');
  });

  it('membatalkan draft kedaluwarsa dan menganonimkan PII terminal setelah 90 hari', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const draft = await createInternal(sales);
    const draftId = draft.body.data.id as string;
    await prisma.order.update({
      where: { id: draftId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await sales.agent.get('/api/v1/orders').expect(200);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: draftId } }),
    ).toMatchObject({ status: 'CANCELLED' });

    const old = await prisma.order.create({
      data: {
        publicCode: 'FS-OLDPII001',
        source: 'INTERNAL',
        status: 'COMPLETED',
        customerName: 'Pelanggan Lama',
        customerPhone: '081111111111',
        totalAmount: 25_000,
        confirmedAt: new Date(Date.now() - 92 * 24 * 60 * 60 * 1000),
        confirmedByUserId: (
          await prisma.user.findUniqueOrThrow({
            where: { emailNormalized: 'sales.orders@example.test' },
          })
        ).id,
        completedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        items: {
          create: {
            productId,
            snapshotSku: 'NPK-ORDER-01',
            snapshotName: 'Pupuk NPK Order',
            snapshotUnit: 'KG',
            unitPrice: 25_000,
            quantity: '1',
            subtotalAmount: 25_000,
          },
        },
      },
    });
    await sales.agent.get(`/api/v1/orders/${old.id}`).expect(200);
    const anonymized = await prisma.order.findUniqueOrThrow({
      where: { id: old.id },
      include: { items: true },
    });
    expect(anonymized).toMatchObject({
      customerName: null,
      customerPhone: null,
      totalAmount: 25_000,
      anonymizedAt: expect.any(Date),
    });
    expect(anonymized.items).toHaveLength(1);
  });

  it('rollback seluruh konfirmasi ketika penulisan audit gagal', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const created = await createInternal(sales, '4');
    const orderId = created.body.data.id as string;
    await transition(sales, orderId, 'SUBMIT');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_order_confirm_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'ORDER_CONFIRM' THEN
          RAISE EXCEPTION 'forced order confirm audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_order_confirm_audit_trigger
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_order_confirm_audit();
    `);
    try {
      await transition(sales, orderId, 'CONFIRM', 500);
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      const balance = await prisma.inventoryBalance.findUniqueOrThrow({
        where: { productId },
      });
      expect(order.status).toBe('PENDING_CONFIRMATION');
      expect(balance.currentStock.toFixed(3)).toBe('10.000');
      expect(await prisma.stockMovement.count()).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_order_confirm_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_order_confirm_audit();',
      );
    }
  });

  it('membatasi spam draft publik', async () => {
    let rateLimited = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/public/order-drafts')
        .set('idempotency-key', randomUUID())
        .send({
          customerName: 'Penguji Rate Limit',
          customerPhone: '081200000000',
          items: items(),
        });
      if (response.status === 429) {
        rateLimited = true;
        expect(response.body.error.code).toBe('RATE_LIMITED');
        break;
      }
    }
    expect(rateLimited).toBe(true);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_order_confirm_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_order_confirm_audit();',
    );
    await app.close();
  });
});
