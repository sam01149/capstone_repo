import { randomUUID } from 'node:crypto';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('FarmSight inventory API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;

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
      'DROP TRIGGER IF EXISTS fail_inventory_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_inventory_audit(); DROP TRIGGER IF EXISTS fail_inventory_balance_trigger ON inventory_balances; DROP FUNCTION IF EXISTS fail_inventory_balance(); DROP TRIGGER IF EXISTS fail_stock_movement_trigger ON stock_movements; DROP FUNCTION IF EXISTS fail_stock_movement();',
    );
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
    const roles = await Promise.all([
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
          name: 'Admin Inventaris',
          email: 'admin.inventory@example.test',
          emailNormalized: 'admin.inventory@example.test',
          passwordHash: await passwords.hash('AdminPassword123'),
          roleId: roles[0].id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Sales Inventaris',
          email: 'sales.inventory@example.test',
          emailNormalized: 'sales.inventory@example.test',
          passwordHash: await passwords.hash('SalesPassword123'),
          roleId: roles[1].id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Petugas Stok',
          email: 'stock.inventory@example.test',
          emailNormalized: 'stock.inventory@example.test',
          passwordHash: await passwords.hash('StockPassword123'),
          roleId: roles[2].id,
        },
      }),
    ]);
  });

  async function login(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { agent, csrf: response.body.data.csrfToken as string };
  }

  async function createProduct(admin: Awaited<ReturnType<typeof login>>) {
    const category = await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: `Pupuk ${randomUUID()}` })
      .expect(201);
    const product = await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send({
        sku: `SKU-${randomUUID()}`,
        name: `Produk ${randomUUID()}`,
        categoryId: category.body.data.id,
        price: 10000,
        minimumStock: '1.250',
        safetyStock: '1',
        reorderPoint: '2.500',
        stockUnit: 'KG',
      })
      .expect(201);
    return product.body.data.id as string;
  }

  function movement(productId: string, overrides = {}) {
    return {
      productId,
      action: 'SET_OPENING_BALANCE',
      quantity: '10.500',
      reasonCode: 'OPENING_BALANCE',
      ...overrides,
    };
  }

  it('memberi akses baca ke semua role internal dan mutasi hanya ke Super Admin/Stock Manager', async () => {
    await request(app.getHttpServer()).get('/api/v1/inventory').expect(401);
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const stock = await login(
      'stock.inventory@example.test',
      'StockPassword123',
    );
    const sales = await login(
      'sales.inventory@example.test',
      'SalesPassword123',
    );
    const productId = await createProduct(admin);

    for (const role of [admin, stock, sales]) {
      await role.agent.get('/api/v1/inventory').expect(200);
      await role.agent.get(`/api/v1/inventory/${productId}`).expect(200);
      await role.agent.get('/api/v1/inventory/movements').expect(200);
    }
    const forbidden = await sales.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', sales.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId))
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  it('mencatat desimal, adjustment, riwayat immutable, dan replay idempotensi', async () => {
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const productId = await createProduct(admin);
    const key = randomUUID();
    const first = await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', key)
      .send({
        reasonCode: 'OPENING_BALANCE',
        quantity: '10.500',
        action: 'SET_OPENING_BALANCE',
        productId,
      })
      .expect(201);
    expect(first.body.data).toMatchObject({
      type: 'IN',
      quantity: '10.500',
      stockBefore: '0.000',
      stockAfter: '10.500',
    });
    const lockedUnit = await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ stockUnit: 'LITER' })
      .expect(409);
    expect(lockedUnit.body.error.code).toBe('STOCK_UNIT_LOCKED');
    const replay = await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', key)
      .send(movement(productId))
      .expect(201);
    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(await prisma.stockMovement.count()).toBe(1);

    const reused = await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', key)
      .send(movement(productId, { quantity: '11' }))
      .expect(409);
    expect(reused.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');

    const adjusted = await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'ADJUST_TO_PHYSICAL',
          quantity: undefined,
          physicalCount: '8.125',
          reasonCode: 'PHYSICAL_COUNT',
          note: 'Hasil hitung fisik gudang.',
        }),
      )
      .expect(201);
    expect(adjusted.body.data).toMatchObject({
      type: 'ADJUSTMENT_OUT',
      quantity: '2.375',
      stockAfter: '8.125',
    });
    const detail = await admin.agent
      .get(`/api/v1/inventory/${productId}`)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      currentStock: '8.125',
      stockUnit: 'KG',
      stockUnitLabel: 'Kilogram',
      stockStatus: 'AVAILABLE',
    });
    expect(detail.body.data.version).toBeUndefined();
    const history = await admin.agent
      .get(
        `/api/v1/inventory/movements?productId=${productId}&action=ADJUST_TO_PHYSICAL&occurredFrom=2026-01-01T00:00:00.000Z&occurredTo=2027-01-01T00:00:00.000Z`,
      )
      .expect(200);
    expect(history.body.data.pagination.total).toBe(1);
    await admin.agent
      .get(
        '/api/v1/inventory/movements?occurredFrom=2027-01-01T00:00:00.000Z&occurredTo=2026-01-01T00:00:00.000Z',
      )
      .expect(400);
  });

  it('menolak stok negatif, pembukaan kedua, backdate tanpa hak, dan penambahan produk nonaktif', async () => {
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const stock = await login(
      'stock.inventory@example.test',
      'StockPassword123',
    );
    const productId = await createProduct(admin);
    const missingKey = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .send(movement(productId))
      .expect(400);
    expect(missingKey.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId, { quantity: '1.2345' }))
      .expect(400);
    await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId, { quantity: '2' }))
      .expect(201);

    const insufficient = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'REDUCE_STOCK',
          quantity: '3',
          reasonCode: 'MANUAL_REDUCTION',
          note: 'Pengurangan manual terverifikasi.',
        }),
      )
      .expect(409);
    expect(insufficient.body.error.code).toBe('INSUFFICIENT_STOCK');

    const secondOpening = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId, { quantity: '1' }))
      .expect(409);
    expect(secondOpening.body.error.code).toBe('OPENING_BALANCE_ALREADY_SET');

    const backdated = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'ADD_STOCK',
          quantity: '1',
          reasonCode: 'RESTOCK',
          occurredAt: '2026-01-01T00:00:00.000Z',
          note: 'Dokumen lama',
        }),
      )
      .expect(403);
    expect(backdated.body.error.code).toBe('BACKDATE_FORBIDDEN');

    await admin.agent
      .post(`/api/v1/products/${productId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    const inactive = await stock.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'ADD_STOCK',
          quantity: '1',
          reasonCode: 'RESTOCK',
        }),
      )
      .expect(409);
    expect(inactive.body.error.code).toBe('PRODUCT_INACTIVE_FOR_MOVEMENT');
  });

  it('menerapkan kebijakan catatan, waktu, seluruh tindakan korektif, dan produk nonaktif', async () => {
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const stock = await login(
      'stock.inventory@example.test',
      'StockPassword123',
    );
    const productId = await createProduct(admin);
    const post = (session: typeof admin, payload: Record<string, unknown>) =>
      session.agent
        .post('/api/v1/inventory/movements')
        .set('x-csrf-token', session.csrf)
        .set('idempotency-key', randomUUID())
        .send(movement(productId, payload));

    await post(stock, { quantity: '10' }).expect(201);
    const missingNote = await post(stock, {
      action: 'MARK_DAMAGED',
      quantity: '1',
      reasonCode: 'DAMAGED',
    }).expect(400);
    expect(missingNote.body.error.code).toBe('MOVEMENT_NOTE_REQUIRED');

    await post(stock, {
      action: 'ADD_STOCK',
      quantity: '2',
      reasonCode: 'PURCHASE',
    }).expect(201);
    await post(stock, {
      action: 'RETURN_CUSTOMER',
      quantity: '0.500',
      reasonCode: 'CUSTOMER_RETURN',
      note: 'Barang retur diperiksa dan layak dijual.',
    }).expect(201);
    await post(stock, {
      action: 'MARK_DAMAGED',
      quantity: '1',
      reasonCode: 'DAMAGED',
      note: 'Kemasan rusak.',
    }).expect(201);
    await post(stock, {
      action: 'MARK_EXPIRED',
      quantity: '1',
      reasonCode: 'EXPIRED',
      note: 'Melewati tanggal kedaluwarsa.',
    }).expect(201);

    await post(stock, {
      action: 'ADD_STOCK',
      quantity: '1',
      reasonCode: 'RESTOCK',
      occurredAt: new Date().toISOString(),
    }).expect(403);
    await post(admin, {
      action: 'ADD_STOCK',
      quantity: '1',
      reasonCode: 'RESTOCK',
      occurredAt: '2027-01-01T00:00:00.000Z',
      note: 'Tidak boleh masa depan.',
    }).expect(400);
    await post(admin, {
      action: 'ADD_STOCK',
      quantity: '1',
      reasonCode: 'RESTOCK',
      occurredAt: '2026-01-01T00:00:00.000Z',
      note: 'Dokumen penerimaan terlambat dicatat.',
    }).expect(201);

    await admin.agent
      .post(`/api/v1/products/${productId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    await post(stock, {
      action: 'REDUCE_STOCK',
      quantity: '1',
      reasonCode: 'MANUAL_REDUCTION',
      note: 'Pengurangan umum tidak boleh untuk produk nonaktif.',
    }).expect(409);
    await post(stock, {
      action: 'MARK_DAMAGED',
      quantity: '1',
      reasonCode: 'DAMAGED',
      note: 'Penyelesaian sisa rusak.',
    }).expect(201);
    const adjusted = await post(stock, {
      action: 'ADJUST_TO_PHYSICAL',
      quantity: undefined,
      physicalCount: '5',
      reasonCode: 'PHYSICAL_COUNT',
      note: 'Penutupan stok produk nonaktif.',
    }).expect(201);
    expect(adjusted.body.data.type).toBe('ADJUSTMENT_OUT');
  });

  it('menserialisasi pengurangan concurrent dan rollback saldo saat audit gagal', async () => {
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const stock = await login(
      'stock.inventory@example.test',
      'StockPassword123',
    );
    const productId = await createProduct(admin);
    await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId, { quantity: '5' }))
      .expect(201);

    const idempotencyKey = randomUUID();
    const sameRequest = () =>
      stock.agent
        .post('/api/v1/inventory/movements')
        .set('x-csrf-token', stock.csrf)
        .set('idempotency-key', idempotencyKey)
        .send(
          movement(productId, {
            action: 'ADD_STOCK',
            quantity: '1',
            reasonCode: 'RESTOCK',
          }),
        );
    const replayResults = await Promise.all([sameRequest(), sameRequest()]);
    expect(replayResults.map((result) => result.status)).toEqual([201, 201]);
    expect(replayResults[0].body.data.id).toBe(replayResults[1].body.data.id);

    const reduce = () =>
      stock.agent
        .post('/api/v1/inventory/movements')
        .set('x-csrf-token', stock.csrf)
        .set('idempotency-key', randomUUID())
        .send(
          movement(productId, {
            action: 'REDUCE_STOCK',
            quantity: '4',
            reasonCode: 'MANUAL_REDUCTION',
            note: 'Pengurangan manual concurrent.',
          }),
        );
    const results = await Promise.all([reduce(), reduce()]);
    expect(
      results.map((result) => result.status).sort(),
      JSON.stringify(results.map((result) => result.body)),
    ).toEqual([201, 409]);
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('2.000');

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_inventory_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'STOCK_MOVEMENT_CREATED' THEN
          RAISE EXCEPTION 'forced inventory audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_inventory_audit_trigger
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_inventory_audit();
    `);
    try {
      await admin.agent
        .post('/api/v1/inventory/movements')
        .set('x-csrf-token', admin.csrf)
        .set('idempotency-key', randomUUID())
        .send(
          movement(productId, {
            action: 'ADD_STOCK',
            quantity: '2',
            reasonCode: 'RESTOCK',
          }),
        )
        .expect(500);
      const afterFailure = await prisma.inventoryBalance.findUniqueOrThrow({
        where: { productId },
      });
      expect(afterFailure.currentStock.toFixed(3)).toBe('2.000');
      expect(await prisma.stockMovement.count({ where: { productId } })).toBe(
        3,
      );
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_inventory_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_inventory_audit();',
      );
    }
  });

  it('melakukan rollback utuh ketika update saldo atau insert movement gagal', async () => {
    const admin = await login(
      'admin.inventory@example.test',
      'AdminPassword123',
    );
    const productId = await createProduct(admin);
    await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', randomUUID())
      .send(movement(productId, { quantity: '5' }))
      .expect(201);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_inventory_balance() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced inventory balance failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_inventory_balance_trigger
      BEFORE UPDATE ON inventory_balances
      FOR EACH ROW EXECUTE FUNCTION fail_inventory_balance();
    `);
    await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'ADD_STOCK',
          quantity: '1',
          reasonCode: 'RESTOCK',
        }),
      )
      .expect(500);
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER fail_inventory_balance_trigger ON inventory_balances; DROP FUNCTION fail_inventory_balance();',
    );

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_stock_movement() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced stock movement failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_stock_movement_trigger
      BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION fail_stock_movement();
    `);
    await admin.agent
      .post('/api/v1/inventory/movements')
      .set('x-csrf-token', admin.csrf)
      .set('idempotency-key', randomUUID())
      .send(
        movement(productId, {
          action: 'ADD_STOCK',
          quantity: '1',
          reasonCode: 'RESTOCK',
        }),
      )
      .expect(500);
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER fail_stock_movement_trigger ON stock_movements; DROP FUNCTION fail_stock_movement();',
    );

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: { productId },
    });
    expect(balance.currentStock.toFixed(3)).toBe('5.000');
    expect(await prisma.stockMovement.count({ where: { productId } })).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: 'STOCK_MOVEMENT_CREATED' },
      }),
    ).toBe(1);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_inventory_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_inventory_audit(); DROP TRIGGER IF EXISTS fail_inventory_balance_trigger ON inventory_balances; DROP FUNCTION IF EXISTS fail_inventory_balance(); DROP TRIGGER IF EXISTS fail_stock_movement_trigger ON stock_movements; DROP FUNCTION IF EXISTS fail_stock_movement();',
    );
    await prisma.stockMovement.deleteMany();
    await prisma.inventoryBalance.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await app.close();
  });
});
