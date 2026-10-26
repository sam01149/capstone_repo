import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('FarmSight product catalog API (e2e)', () => {
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
      'DROP TRIGGER IF EXISTS fail_catalog_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_catalog_audit();',
    );
    await prisma.stockMovement.deleteMany();
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
          name: 'Admin Produk',
          email: 'admin.products@example.test',
          emailNormalized: 'admin.products@example.test',
          passwordHash: await passwords.hash('AdminPassword123'),
          roleId: adminRole.id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Sales Produk',
          email: 'sales.products@example.test',
          emailNormalized: 'sales.products@example.test',
          passwordHash: await passwords.hash('SalesPassword123'),
          roleId: salesRole.id,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Stock Produk',
          email: 'stock.products@example.test',
          emailNormalized: 'stock.products@example.test',
          passwordHash: await passwords.hash('StockPassword123'),
          roleId: stockRole.id,
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

  function productPayload(categoryId: string, overrides = {}) {
    return {
      sku: 'NPK-001',
      name: 'Pupuk NPK Mutiara',
      description: 'Pupuk untuk pertumbuhan tanaman.',
      categoryId,
      price: 125000,
      imageRef: 'https://images.example.test/npk.jpg',
      minimumStock: '10',
      leadTimeDays: 7,
      safetyStock: '5',
      reorderPoint: '15',
      stockUnit: 'KG',
      ...overrides,
    };
  }

  it('mewajibkan sesi, membuka baca untuk semua role internal, dan membatasi mutation ke Super Admin', async () => {
    await request(app.getHttpServer()).get('/api/v1/categories').expect(401);
    await request(app.getHttpServer()).get('/api/v1/products').expect(401);
    const category = await prisma.category.create({
      data: {
        name: 'Pupuk',
        nameNormalized: 'pupuk',
        slug: 'pupuk',
      },
    });
    const product = await prisma.product.create({
      data: {
        sku: 'NPK-001',
        skuNormalized: 'npk-001',
        name: 'Pupuk NPK',
        slug: 'pupuk-npk',
        categoryId: category.id,
        price: 100000,
      },
    });
    const sales = await login(
      'sales.products@example.test',
      'SalesPassword123',
    );
    const stock = await login(
      'stock.products@example.test',
      'StockPassword123',
    );
    const admin = await login(
      'admin.products@example.test',
      'AdminPassword123',
    );
    await admin.agent
      .post('/api/v1/categories')
      .send({ name: 'Tanpa CSRF' })
      .expect(403);
    await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', 'csrf-salah')
      .send({ name: 'CSRF Salah' })
      .expect(403);
    for (const role of [sales, stock]) {
      await role.agent.get('/api/v1/categories').expect(200);
      await role.agent.get(`/api/v1/categories/${category.id}`).expect(200);
      await role.agent.get('/api/v1/products').expect(200);
      await role.agent.get(`/api/v1/products/${product.id}`).expect(200);
      const forbidden = await role.agent
        .post('/api/v1/categories')
        .set('x-csrf-token', role.csrf)
        .send({ name: 'Tidak Diizinkan' })
        .expect(403);
      expect(forbidden.body.error.code).toBe('FORBIDDEN');
      await role.agent
        .patch(`/api/v1/products/${product.id}`)
        .set('x-csrf-token', role.csrf)
        .send({ price: 90000 })
        .expect(403);
    }
  });

  it('mengelola kategori dan produk dengan slug stabil, validasi ketat, filter, gambar opsional, dan deaktivasi aman', async () => {
    const admin = await login(
      'admin.products@example.test',
      'AdminPassword123',
    );
    const categoryResponse = await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: '  Pupuk   Tanaman ' })
      .expect(201);
    const categoryId = categoryResponse.body.data.id as string;
    expect(categoryResponse.body.data).toMatchObject({
      name: 'Pupuk Tanaman',
      slug: 'pupuk-tanaman',
      isActive: true,
    });
    const duplicateCategory = await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'PUPUK TANAMAN' })
      .expect(409);
    expect(duplicateCategory.body.error.code).toBe(
      'CATEGORY_NAME_ALREADY_USED',
    );
    const duplicateCategorySlug = await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'Pupuk-Tanaman' })
      .expect(409);
    expect(duplicateCategorySlug.body.error.code).toBe(
      'CATEGORY_SLUG_ALREADY_USED',
    );

    const renamedCategory = await admin.agent
      .patch(`/api/v1/categories/${categoryId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'Nutrisi Tanaman' })
      .expect(200);
    expect(renamedCategory.body.data).toMatchObject({
      name: 'Nutrisi Tanaman',
      slug: 'pupuk-tanaman',
    });
    await admin.agent
      .patch(`/api/v1/categories/${categoryId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ name: null })
      .expect(400);

    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { price: 0 }))
      .expect(400);
    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { price: 1.5 }))
      .expect(400);
    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { minimumStock: '-1' }))
      .expect(400);
    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { leadTimeDays: 3651 }))
      .expect(400);
    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(
        productPayload(categoryId, {
          imageRef: 'http://example.test/image.jpg',
        }),
      )
      .expect(400);
    await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { stock: 99 }))
      .expect(400);

    const created = await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId))
      .expect(201);
    const productId = created.body.data.id as string;
    expect(created.body.data).toMatchObject({
      sku: 'NPK-001',
      slug: 'pupuk-npk-mutiara',
      imageRef: 'https://images.example.test/npk.jpg',
      minimumStock: '10.000',
      leadTimeDays: 7,
      safetyStock: '5.000',
      reorderPoint: '15.000',
      stockUnit: 'KG',
      stockUnitLabel: 'Kilogram',
      category: { id: categoryId, name: 'Nutrisi Tanaman' },
    });
    const duplicateSku = await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { sku: ' npk-001 ', name: 'Nama Lain' }))
      .expect(409);
    expect(duplicateSku.body.error.code).toBe('SKU_ALREADY_USED');
    const duplicateSlug = await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId, { sku: 'NPK-002' }))
      .expect(409);
    expect(duplicateSlug.body.error.code).toBe('PRODUCT_SLUG_ALREADY_USED');

    const list = await admin.agent
      .get(
        `/api/v1/products?search=npk&categoryId=${categoryId}&isActive=true&sort=sku&order=asc`,
      )
      .expect(200);
    expect(list.body.data.pagination).toMatchObject({
      total: 1,
      totalPages: 1,
    });
    expect(list.body.data.items[0].id).toBe(productId);
    await admin.agent.get('/api/v1/products?limit=101').expect(400);
    await admin.agent.get('/api/v1/products?sort=stock').expect(400);
    await admin.agent.get('/api/v1/products?categoryId=bukan-uuid').expect(400);
    await admin.agent.get('/api/v1/products/bukan-uuid').expect(400);

    const updated = await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('x-csrf-token', admin.csrf)
      .send({
        name: 'Pupuk NPK Premium',
        imageRef: 'https://cdn.example.test/npk-new.webp',
        safetyStock: '8',
        reorderPoint: '20',
      })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      name: 'Pupuk NPK Premium',
      slug: 'pupuk-npk-mutiara',
      imageRef: 'https://cdn.example.test/npk-new.webp',
      safetyStock: '8.000',
      reorderPoint: '20.000',
    });
    const cleared = await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ imageRef: '' })
      .expect(200);
    expect(cleared.body.data.imageRef).toBeNull();
    await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('x-csrf-token', admin.csrf)
      .send({})
      .expect(400);
    await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('x-csrf-token', admin.csrf)
      .send({ price: null })
      .expect(400);

    const categoryBlocked = await admin.agent
      .post(`/api/v1/categories/${categoryId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(409);
    expect(categoryBlocked.body.error.code).toBe(
      'CATEGORY_HAS_ACTIVE_PRODUCTS',
    );
    await admin.agent
      .post(`/api/v1/products/${productId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    const inactiveDetail = await admin.agent
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    expect(inactiveDetail.body.data.isActive).toBe(false);
    await admin.agent
      .post(`/api/v1/products/${productId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    await admin.agent
      .post(`/api/v1/categories/${categoryId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    await admin.agent
      .post(`/api/v1/categories/${categoryId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    expect(
      await prisma.auditLog.count({ where: { action: 'PRODUCT_DEACTIVATED' } }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: 'CATEGORY_DEACTIVATED' },
      }),
    ).toBe(1);
  });

  it('menolak kategori tidak aktif serta menjaga keunikan pada request concurrent', async () => {
    const admin = await login(
      'admin.products@example.test',
      'AdminPassword123',
    );
    const first = admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'Pestisida' });
    const second = admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: ' PESTISIDA ' });
    const categoryResults = await Promise.all([first, second]);
    expect(categoryResults.map((result) => result.status).sort()).toEqual([
      201, 409,
    ]);
    const categoryId = categoryResults.find((result) => result.status === 201)
      ?.body.data.id as string;
    await admin.agent
      .post(`/api/v1/categories/${categoryId}/deactivate`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    const inactive = await admin.agent
      .post('/api/v1/products')
      .set('x-csrf-token', admin.csrf)
      .send(productPayload(categoryId))
      .expect(409);
    expect(inactive.body.error.code).toBe('PRODUCT_CATEGORY_INACTIVE');

    const activeCategory = await admin.agent
      .post('/api/v1/categories')
      .set('x-csrf-token', admin.csrf)
      .send({ name: 'Benih' })
      .expect(201);
    const productResults = await Promise.all([
      admin.agent
        .post('/api/v1/products')
        .set('x-csrf-token', admin.csrf)
        .send(
          productPayload(activeCategory.body.data.id, {
            sku: 'BENIH-01',
            name: 'Benih A',
          }),
        ),
      admin.agent
        .post('/api/v1/products')
        .set('x-csrf-token', admin.csrf)
        .send(
          productPayload(activeCategory.body.data.id, {
            sku: ' benih-01 ',
            name: 'Benih B',
          }),
        ),
    ]);
    expect(productResults.map((result) => result.status).sort()).toEqual([
      201, 409,
    ]);
  });

  it('melakukan rollback mutation kategori dan produk bila audit gagal', async () => {
    const admin = await login(
      'admin.products@example.test',
      'AdminPassword123',
    );
    const category = await prisma.category.create({
      data: { name: 'Alat', nameNormalized: 'alat', slug: 'alat' },
    });
    const product = await prisma.product.create({
      data: {
        sku: 'ALAT-01',
        skuNormalized: 'alat-01',
        name: 'Sekop',
        slug: 'sekop',
        categoryId: category.id,
        price: 50000,
      },
    });
    const emptyCategory = await prisma.category.create({
      data: { name: 'Kosong', nameNormalized: 'kosong', slug: 'kosong' },
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_catalog_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action IN ('CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DEACTIVATED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED') THEN
          RAISE EXCEPTION 'forced catalog audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_catalog_audit_trigger
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_catalog_audit();
    `);
    try {
      await admin.agent
        .post('/api/v1/categories')
        .set('x-csrf-token', admin.csrf)
        .send({ name: 'Harus Rollback' })
        .expect(500);
      await admin.agent
        .patch(`/api/v1/categories/${category.id}`)
        .set('x-csrf-token', admin.csrf)
        .send({ name: 'Alat Baru' })
        .expect(500);
      await admin.agent
        .post(`/api/v1/categories/${emptyCategory.id}/deactivate`)
        .set('x-csrf-token', admin.csrf)
        .expect(500);
      await admin.agent
        .post('/api/v1/products')
        .set('x-csrf-token', admin.csrf)
        .send(
          productPayload(category.id, {
            sku: 'ROLLBACK-01',
            name: 'Produk Gagal',
          }),
        )
        .expect(500);
      await admin.agent
        .patch(`/api/v1/products/${product.id}`)
        .set('x-csrf-token', admin.csrf)
        .send({ price: 90000 })
        .expect(500);
      await admin.agent
        .post(`/api/v1/products/${product.id}/deactivate`)
        .set('x-csrf-token', admin.csrf)
        .expect(500);

      expect(
        await prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).toMatchObject({
        name: 'Alat',
        isActive: true,
      });
      expect(
        await prisma.category.findUniqueOrThrow({
          where: { id: emptyCategory.id },
        }),
      ).toMatchObject({ isActive: true });
      expect(
        await prisma.product.findUniqueOrThrow({ where: { id: product.id } }),
      ).toMatchObject({
        price: 50000,
        isActive: true,
      });
      expect(
        await prisma.category.findUnique({
          where: { nameNormalized: 'harus rollback' },
        }),
      ).toBeNull();
      expect(
        await prisma.product.findUnique({
          where: { skuNormalized: 'rollback-01' },
        }),
      ).toBeNull();
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_catalog_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_catalog_audit();',
      );
    }
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_catalog_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_catalog_audit();',
    );
    await prisma.stockMovement.deleteMany();
    await prisma.inventoryBalance.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await app.close();
  });
});
