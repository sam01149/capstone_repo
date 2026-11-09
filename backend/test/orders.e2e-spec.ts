import { resetTestData } from './reset-test-data.js';
import { randomUUID } from 'node:crypto';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
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
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_workflow_notification_trigger ON notifications; DROP FUNCTION IF EXISTS fail_workflow_notification(); DROP TRIGGER IF EXISTS fail_workflow_settlement_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_workflow_settlement();',
    );
    await resetTestData(prisma);

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

  const paymentProof =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOuoAAAAASUVORK5CYII=';
  async function recordPayment(
    actor: Awaited<ReturnType<typeof login>>,
    id: string,
    amount?: number,
  ) {
    const current = await actor.agent.get('/api/v1/orders/' + id).expect(200);
    return actor.agent
      .post('/api/v1/orders/' + id + '/transition')
      .set('x-csrf-token', actor.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        action: 'RECORD_PAYMENT',
        amount: amount ?? current.body.data.totalAmount,
        proofImage: paymentProof,
      })
      .expect(201);
  }

  async function transition(
    actor: Awaited<ReturnType<typeof login>>,
    orderId: string,
    action: string,
    expected = 201,
  ) {
    if (action === 'COMPLETE' && expected !== 409 && expected !== 403) {
      const current = await actor.agent
        .get('/api/v1/orders/' + orderId)
        .expect(200);
      if (
        current.body.data.status === 'CONFIRMED' &&
        !current.body.data.stockDeductedAt &&
        current.body.data.payment.status !== 'RECEIVED'
      )
        await recordPayment(actor, orderId);
    }
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

  it('mereservasi saat konfirmasi dan mengurangi stok tepat sekali saat selesai', async () => {
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
    expect(balance.currentStock.toFixed(3)).toBe('10.000');
    expect(balance.reservedStock.toFixed(3)).toBe('2.500');
    expect(first.body.data.items[0].reservedQuantity).toBe('2.500');
    expect(
      await prisma.stockMovement.count({
        where: { referenceId: orderId, type: 'SALE_OUT' },
      }),
    ).toBe(0);
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
    await recordPayment(sales, orderId);
    const completeKey = randomUUID();
    const complete = () =>
      sales.agent
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', completeKey)
        .send({ action: 'COMPLETE' });
    await complete().expect(201);
    await complete().expect(201);
    await transition(sales, orderId, 'CANCEL', 409);
    await transition(sales, orderId, 'COMPLETE', 409);
    expect(await prisma.stockMovement.count()).toBe(1);
    const settled = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(settled.currentStock.toFixed(3)).toBe('7.500');
    expect(settled.reservedStock.toFixed(3)).toBe('0.000');
    expect((await prisma.stockMovement.findFirstOrThrow()).action).toBe(
      'COMPLETE_ORDER',
    );
    const movementList = await sales.agent
      .get('/api/v1/inventory/movements?type=SALE_OUT&action=COMPLETE_ORDER')
      .expect(200);
    expect(movementList.body.data.items).toHaveLength(1);
  });

  it('menolak stok kurang tanpa efek parsial dan mengunci persaingan konfirmasi', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const tooLarge = await createInternal(sales, '11');
    const tooLargeId = tooLarge.body.data.id as string;
    await transition(sales, tooLargeId, 'SUBMIT');
    const rejected = await transition(sales, tooLargeId, 'CONFIRM', 409);
    expect(rejected.body.error.code).toBe('ORDER_STOCK_INSUFFICIENT');
    await transition(sales, tooLargeId, 'CONFIRM', 409);
    expect(
      await prisma.notification.count({
        where: {
          targetId: tooLargeId,
          kind: 'ORDER_STOCK_INSUFFICIENT',
          active: true,
        },
      }),
    ).toBe(1);
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
    ).toBe(2);

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
    ).toBe('10.000');
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).reservedStock.toFixed(3),
    ).toBe('7.000');
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
      expect(balance.reservedStock.toFixed(3)).toBe('0.000');
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

  it('menggabungkan notifikasi stok dan membuat ulang hanya setelah pulih', async () => {
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    await prisma.product.update({
      where: { id: productId },
      data: { minimumStock: '5', reorderPoint: '6' },
    });
    await prisma.inventoryBalance.update({
      where: { productId },
      data: { currentStock: '4' },
    });
    await prisma.inventoryBalance.update({
      where: { productId },
      data: { currentStock: '3' },
    });
    const alerts = await prisma.notification.findMany({
      where: { targetId: productId, kind: 'STOCK_ALERT', active: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('minimum dan mencapai ROP');
    const response = await stock.agent.get('/api/v1/notifications').expect(200);
    expect(
      response.body.data.items.some(
        (n: { id: string }) => n.id === alerts[0].id,
      ),
    ).toBe(true);
    await stock.agent
      .post(`/api/v1/notifications/${alerts[0].id}/read`)
      .set('x-csrf-token', stock.csrf)
      .expect(201);
    await prisma.inventoryBalance.update({
      where: { productId },
      data: { currentStock: '10' },
    });
    await prisma.inventoryBalance.update({
      where: { productId },
      data: { currentStock: '3' },
    });
    const history = await prisma.notification.findMany({
      where: { targetId: productId, kind: 'STOCK_ALERT' },
    });
    expect(history).toHaveLength(2);
    expect(history.filter((n) => n.active)).toHaveLength(1);
  });

  it('membatasi akses dashboard dan ekspor sesuai role', async () => {
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    await request(app.getHttpServer())
      .get('/api/v1/dashboards/inventory')
      .expect(401);
    await stock.agent.get('/api/v1/dashboards/inventory').expect(200);
    await stock.agent.get('/api/v1/dashboards/sales').expect(403);
    await sales.agent.get('/api/v1/reports/inventory').expect(403);
    await stock.agent
      .get('/api/v1/reports/inventory/export/csv')
      .expect('Content-Type', /text\/csv/)
      .expect(200);
    await stock.agent
      .get('/api/v1/reports/inventory/export/pdf')
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
  });

  it('menghitung penjualan pada stock out, bukan reservasi, dan mengamankan sel CSV', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    const order = await createInternal(sales, '2');
    const before = await sales.agent
      .get('/api/v1/dashboards/sales')
      .expect(200);
    expect(before.body.data.totalSales).toBe('0');
    await transition(sales, order.body.data.id, 'SUBMIT');
    await transition(sales, order.body.data.id, 'CONFIRM');
    const reserved = await sales.agent
      .get('/api/v1/dashboards/sales')
      .expect(200);
    expect(reserved.body.data.totalSales).toBe('0');
    const reservedReport = await sales.agent
      .get('/api/v1/reports/sales')
      .expect(200);
    expect(reservedReport.body.data.rows).toHaveLength(0);
    await transition(sales, order.body.data.id, 'COMPLETE');
    const after = await sales.agent.get('/api/v1/dashboards/sales').expect(200);
    expect(after.body.data.totalSales).toBe('50000');
    const soldReport = await sales.agent
      .get('/api/v1/reports/sales')
      .expect(200);
    expect(soldReport.body.data.rows).toHaveLength(1);
    expect(soldReport.body.data.rows[0].stokKeluar).toEqual(expect.any(String));
    await prisma.product.update({
      where: { id: productId },
      data: { name: '=1+1' },
    });
    const csv = await stock.agent
      .get('/api/v1/reports/inventory/export/csv')
      .expect(200);
    expect(csv.text).toContain("'=1+1");
  });

  it('membatalkan reservasi tanpa movement dan melindungi saldo bebas dari mutasi manual', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    const order = await createInternal(sales, '10');
    const id = order.body.data.id as string;
    await transition(sales, id, 'SUBMIT');
    await transition(sales, id, 'CONFIRM');
    const inventory = await stock.agent
      .get(`/api/v1/inventory/${productId}`)
      .expect(200);
    expect(inventory.body.data).toMatchObject({
      currentStock: '10.000',
      reservedStock: '10.000',
      availableStock: '0.000',
    });
    const catalog = await request(app.getHttpServer())
      .get('/api/v1/public/products/pupuk-npk-order')
      .expect(200);
    expect(catalog.body.data.availability).toBe('OUT_OF_STOCK');
    const blocked = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        action: 'REDUCE_STOCK',
        quantity: '1',
        reasonCode: 'MANUAL_REDUCTION',
        note: 'Uji perlindungan reservasi',
      })
      .expect(409);
    expect(blocked.body.error.code).toBe('STOCK_RESERVED');
    const key = randomUUID();
    for (let i = 0; i < 2; i++) {
      await sales.agent
        .post(`/api/v1/orders/${id}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', key)
        .send({ action: 'CANCEL' })
        .expect(201);
    }
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('10.000');
    expect(balance.reservedStock.toFixed(3)).toBe('0.000');
    expect(await prisma.stockMovement.count()).toBe(0);
    await transition(sales, id, 'COMPLETE', 409);
    const available = await request(app.getHttpServer())
      .get('/api/v1/public/products/pupuk-npk-order')
      .expect(200);
    expect(available.body.data.availability).toBe('AVAILABLE');
  });

  it('mengirim satu notifikasi saat submit, terisolasi per role, dan mengarsipkan saat diproses', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    const admin = await login('admin.orders@example.test', 'AdminPassword123');
    const order = await createInternal(sales);
    const id = order.body.data.id as string;
    expect(await prisma.notification.count({ where: { targetId: id } })).toBe(
      0,
    );
    const key = randomUUID();
    const submit = () =>
      sales.agent
        .post(`/api/v1/orders/${id}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', key)
        .send({ action: 'SUBMIT' });
    const results = await Promise.all([submit(), submit()]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const alerts = await prisma.notification.findMany({
      where: { targetId: id, kind: 'NEW_ORDER' },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].recipientRole).toBe('SALES_ADMIN');
    const list = await sales.agent.get('/api/v1/notifications').expect(200);
    expect(
      list.body.data.items.some(
        (item: { id: string }) => item.id === alerts[0].id,
      ),
    ).toBe(true);
    for (const actor of [stock, admin]) {
      const other = await actor.agent.get('/api/v1/notifications').expect(200);
      expect(
        other.body.data.items.some(
          (item: { id: string }) => item.id === alerts[0].id,
        ),
      ).toBe(false);
      await actor.agent
        .post(`/api/v1/notifications/${alerts[0].id}/read`)
        .set('x-csrf-token', actor.csrf)
        .expect(404);
    }
    await transition(sales, id, 'CONFIRM');
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: alerts[0].id },
        })
      ).active,
    ).toBe(false);
    expect(
      await prisma.notification.count({
        where: { targetId: id, kind: 'NEW_ORDER' },
      }),
    ).toBe(1);
  });

  it('rollback submit, complete dan cancel bersama audit atau notifikasi yang gagal', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const order = await createInternal(sales, '4');
    const id = order.body.data.id as string;
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION fail_workflow_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind = 'NEW_ORDER' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_workflow_notification_trigger BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_workflow_notification();`,
    );
    try {
      await transition(sales, id, 'SUBMIT', 500);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('DRAFT');
      expect(await prisma.notification.count({ where: { targetId: id } })).toBe(
        0,
      );
      expect(
        await prisma.orderMutation.count({
          where: { orderId: id, kind: 'SUBMIT' },
        }),
      ).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER fail_workflow_notification_trigger ON notifications; DROP FUNCTION fail_workflow_notification();',
      );
    }
    await transition(sales, id, 'SUBMIT');
    await transition(sales, id, 'CONFIRM');
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION fail_workflow_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('ORDER_COMPLETE', 'ORDER_CANCEL') THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_workflow_settlement_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_workflow_settlement();`,
    );
    try {
      for (const action of ['COMPLETE', 'CANCEL']) {
        await transition(sales, id, action, 500);
        const balance = await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        });
        expect(balance.currentStock.toFixed(3)).toBe('10.000');
        expect(balance.reservedStock.toFixed(3)).toBe('4.000');
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
        ).toBe('CONFIRMED');
        expect(await prisma.stockMovement.count()).toBe(0);
      }
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER fail_workflow_settlement_trigger ON audit_logs; DROP FUNCTION fail_workflow_settlement();',
      );
    }
    await transition(sales, id, 'COMPLETE');
  });

  it('tidak memotong ulang order lama yang sudah stock out saat konfirmasi', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const order = await createInternal(sales, '2');
    const id = order.body.data.id as string;
    const legacy = await prisma.order.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        stockDeductedAt: new Date(),
      },
      include: { items: true },
    });
    const actor = await prisma.user.findUniqueOrThrow({
      where: { emailNormalized: 'sales.orders@example.test' },
    });
    await prisma.inventoryBalance.update({
      where: { productId },
      data: { currentStock: '8' },
    });
    await prisma.stockMovement.create({
      data: {
        productId,
        orderItemId: legacy.items[0].id,
        actorUserId: actor.id,
        type: 'SALE_OUT',
        action: 'CONFIRM_ORDER',
        quantity: '2',
        stockBefore: '10',
        stockAfter: '8',
        reasonCode: 'SALE',
        referenceType: 'ORDER',
        referenceId: id,
        idempotencyKey: randomUUID(),
        payloadHash: 'a'.repeat(64),
        occurredAt: legacy.stockDeductedAt!,
      },
    });
    await transition(sales, id, 'CANCEL', 409);
    await transition(sales, id, 'COMPLETE');
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('8.000');
    expect(balance.reservedStock.toFixed(3)).toBe('0.000');
    expect(await prisma.stockMovement.count()).toBe(1);
    expect(
      (await sales.agent.get('/api/v1/dashboards/sales').expect(200)).body.data
        .totalSales,
    ).toBe('50000');
  });

  it('mereservasi multi-produk seluruhnya atau menolak seluruhnya', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const source = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    const second = await prisma.product.create({
      data: {
        sku: 'SECOND',
        skuNormalized: 'second',
        name: 'Second',
        slug: 'second',
        categoryId: source.categoryId,
        price: 1000,
        inventoryBalance: { create: { currentStock: '1' } },
      },
    });
    const order = await sales.agent
      .post('/api/v1/orders')
      .set('x-csrf-token', sales.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        customerName: 'Uji multi-produk',
        items: [
          { productId, quantity: '3' },
          { productId: second.id, quantity: '2' },
        ],
      })
      .expect(201);
    const id = order.body.data.id as string;
    await transition(sales, id, 'SUBMIT');
    await transition(sales, id, 'CONFIRM', 409);
    const untouched = await prisma.inventoryBalance.findMany({
      where: { productId: { in: [productId, second.id] } },
    });
    expect(untouched.every((balance) => balance.reservedStock.isZero())).toBe(
      true,
    );
    await prisma.inventoryBalance.update({
      where: { productId: second.id },
      data: { currentStock: '2' },
    });
    await transition(sales, id, 'CONFIRM');
    expect(await prisma.stockMovement.count()).toBe(0);
    await transition(sales, id, 'COMPLETE');
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).currentStock.toFixed(3),
    ).toBe('7.000');
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId: second.id },
        })
      ).currentStock.toFixed(3),
    ).toBe('0.000');
    expect(
      await prisma.stockMovement.count({ where: { referenceId: id } }),
    ).toBe(2);
  });

  it('menserialisasi persaingan complete dan cancel tanpa pelepasan atau pemotongan ganda', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const order = await createInternal(sales, '3');
    const id = order.body.data.id as string;
    await transition(sales, id, 'SUBMIT');
    await transition(sales, id, 'CONFIRM');
    const act = (action: string) =>
      sales.agent
        .post(`/api/v1/orders/${id}/transition`)
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', randomUUID())
        .send({ action });
    await recordPayment(sales, id);
    const responses = await Promise.all([act('COMPLETE'), act('CANCEL')]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const final = await prisma.order.findUniqueOrThrow({ where: { id } });
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(['COMPLETED', 'CANCELLED']).toContain(final.status);
    expect(balance.reservedStock.toFixed(3)).toBe('0.000');
    expect(balance.currentStock.toFixed(3)).toBe(
      final.status === 'COMPLETED' ? '7.000' : '10.000',
    );
    expect(await prisma.stockMovement.count()).toBe(
      final.status === 'COMPLETED' ? 1 : 0,
    );
  });

  it('menegakkan bukti, nominal, privasi dan idempotensi alur pembayaran manual', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const stock = await login('stock.orders@example.test', 'StockPassword123');
    const created = await createInternal(sales, '2');
    const id = created.body.data.id as string;
    await transition(sales, id, 'SUBMIT');
    await transition(sales, id, 'CONFIRM');
    const send = (body: object, key = randomUUID()) =>
      sales.agent
        .post('/api/v1/orders/' + id + '/transition')
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', key)
        .send(body);
    await send({ action: 'COMPLETE' }).expect(409);
    await send({
      action: 'RECORD_PAYMENT',
      amount: 50000,
      proofImage: 'data:image/svg+xml;base64,PHN2Zz4=',
    }).expect(400);
    await send({
      action: 'RECORD_PAYMENT',
      amount: 50000,
      proofImage: 'data:image/png;base64,PHNjcmlwdD4=',
    }).expect(400);
    await send({
      action: 'RECORD_PAYMENT',
      amount: 0,
      proofImage: paymentProof,
    }).expect(400);
    await stock.agent.get('/api/v1/orders/' + id).expect(403);
    await stock.agent
      .post('/api/v1/orders/' + id + '/transition')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        action: 'RECORD_PAYMENT',
        amount: 50000,
        proofImage: paymentProof,
      })
      .expect(403);
    await sales.agent
      .post('/api/v1/orders/' + id + '/transition')
      .set('idempotency-key', randomUUID())
      .send({ action: 'MARK_QRIS_SENT' })
      .expect(403);
    await send({ action: 'MARK_QRIS_SENT' }).expect(201);
    await recordPayment(sales, id, 49000);
    await send({ action: 'COMPLETE' }).expect(409);
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).currentStock.toFixed(3),
    ).toBe('10.000');
    await send({
      action: 'REQUEST_RETRANSFER',
      note: 'Nominal belum sesuai',
    }).expect(201);
    await send({ action: 'COMPLETE' }).expect(409);
    const key = randomUUID();
    const body = {
      action: 'RECORD_PAYMENT',
      amount: 50000,
      proofImage: paymentProof,
    };
    await send(body, key).expect(201);
    await send(body, key).expect(201);
    await send({ ...body, amount: 51000 }, key).expect(409);
    const list = await sales.agent.get('/api/v1/orders').expect(200);
    expect(list.body.data.items[0].payment).toMatchObject({
      hasProof: true,
      status: 'RECEIVED',
      amount: 50000,
    });
    expect(list.body.data.items[0].payment).not.toHaveProperty('proofImage');
    const detail = await sales.agent.get('/api/v1/orders/' + id).expect(200);
    expect(detail.headers['cache-control']).toBe('no-store');
    expect(detail.body.data.payment.proofImage).toBe(paymentProof);
    const completeKey = randomUUID();
    await send({ action: 'COMPLETE' }, completeKey).expect(201);
    await send({ action: 'COMPLETE' }, completeKey).expect(201);
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: { productId },
        })
      ).currentStock.toFixed(3),
    ).toBe('8.000');
    expect(await prisma.stockMovement.count()).toBe(1);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id } })).payment,
    ).toMatchObject({ status: 'VERIFIED', amount: 50000 });
    const logs = await prisma.auditLog.findMany({ where: { targetId: id } });
    expect(JSON.stringify(logs)).not.toContain(paymentProof);
    await send({
      action: 'RECORD_PAYMENT',
      amount: 50000,
      proofImage: paymentProof,
    }).expect(409);
  });

  it('merahasiakan metadata pembayaran dari draft publik dan membersihkannya saat retensi', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/public/order-drafts')
      .set('idempotency-key', randomUUID())
      .send({
        customerName: 'Uji Publik',
        customerPhone: '080000000000',
        items: items(),
      })
      .expect(201);
    expect(draft.body.data).not.toHaveProperty('payment');
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const order = await prisma.order.findUniqueOrThrow({
      where: { publicCode: draft.body.data.publicCode },
    });
    await transition(sales, order.id, 'SUBMIT');
    await transition(sales, order.id, 'CONFIRM');
    await recordPayment(sales, order.id);
    await transition(sales, order.id, 'COMPLETE');
    await prisma.order.update({
      where: { id: order.id },
      data: { completedAt: new Date(Date.now() - 91 * 86400000) },
    });
    const detail = await sales.agent
      .get('/api/v1/orders/' + order.id)
      .expect(200);
    expect(detail.body.data.payment.hasProof).toBe(false);
    expect(detail.body.data.customer.anonymized).toBe(true);
  });

  it('validasi alur Novita mencadangkan stok cukup atau membatalkan stok kurang secara atomik', async () => {
    const sales = await login('sales.orders@example.test', 'SalesPassword123');
    const good = await createInternal(sales, '2');
    await transition(sales, good.body.data.id, 'SUBMIT');
    const reserved = await transition(
      sales,
      good.body.data.id,
      'VALIDATE_STOCK',
    );
    expect(reserved.body.data.status).toBe('CONFIRMED');
    const bad = await createInternal(sales, '9');
    const id = bad.body.data.id as string;
    await transition(sales, id, 'SUBMIT');
    const key = randomUUID();
    const validate = () =>
      sales.agent
        .post('/api/v1/orders/' + id + '/transition')
        .set('x-csrf-token', sales.csrf)
        .set('idempotency-key', key)
        .send({ action: 'VALIDATE_STOCK' });
    const cancelled = await validate().expect(201);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    await validate().expect(201);
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('10.000');
    expect(balance.reservedStock.toFixed(3)).toBe('2.000');
    expect(await prisma.stockMovement.count()).toBe(0);
    expect(
      await prisma.notification.count({
        where: { kind: 'ORDER_STOCK_INSUFFICIENT', targetId: id },
      }),
    ).toBe(1);
    const rollback = await createInternal(sales, '11');
    const rollbackId = rollback.body.data.id as string;
    await transition(sales, rollbackId, 'SUBMIT');
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION fail_workflow_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind = 'ORDER_STOCK_INSUFFICIENT' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_workflow_notification_trigger BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_workflow_notification();",
    );
    try {
      await transition(sales, rollbackId, 'VALIDATE_STOCK', 500);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: rollbackId } }))
          .status,
      ).toBe('PENDING_CONFIRMATION');
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER fail_workflow_notification_trigger ON notifications; DROP FUNCTION fail_workflow_notification();',
      );
    }
  });

  it('menolak payload bukti berlebihan dan JSON rusak dengan error yang jelas', async () => {
    const large = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ proofImage: 'x'.repeat(1200000) })
      .expect(413);
    expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('content-type', 'application/json')
      .send('{broken')
      .expect(400);
    expect(invalid.body.error.code).toBe('INVALID_JSON');
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_order_confirm_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_order_confirm_audit();',
    );
    await app.close();
  });
});
