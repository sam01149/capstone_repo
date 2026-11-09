import { resetTestData } from './reset-test-data.js';
import { randomUUID } from 'node:crypto';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/app.setup.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('forecast history import (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;
  let adminId: string;
  let admin: { agent: ReturnType<typeof request.agent>; csrf: string };
  let stock: { agent: ReturnType<typeof request.agent>; csrf: string };
  let config: ConfigService;
  const route = '/api/v1/forecasts/history/import';
  const row = {
    week: '2026-01-05',
    quantity: '2.250',
    bazaar: false,
    miniBazaar: true,
  };
  const body = () => ({
    confirmedComplete: true,
    productId,
    sourceHash: 'a'.repeat(64),
    sourceProductCount: 1,
    sourceStartWeek: '2026-01-05',
    sourceEndWeek: '2026-01-05',
    unrecordedWeeks: [],
    weeks: [row],
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.init();
    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    config.set('FORECAST_PYTHON_PATH', process.execPath);
    config.set(
      'FORECAST_WORKER_PATH',
      join(process.cwd(), 'test/fixtures/forecast-worker.cjs'),
    );
    config.set('FORECAST_CAPTURE_START', '');
  });
  beforeEach(async () => {
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    config.set('FORECAST_CAPTURE_START', '');
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_forecast_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_forecast_audit();',
    );
    await resetTestData(prisma);
    const roles = await Promise.all(
      ['SUPER_ADMIN', 'STOCK_MANAGER', 'SALES_ADMIN'].map((code) =>
        prisma.role.create({ data: { code, name: code } }),
      ),
    );
    const hash = await app.get(PasswordService).hash('Password123');
    const users = await Promise.all(
      roles.map((role, i) =>
        prisma.user.create({
          data: {
            name: `User ${i}`,
            email: `forecast${i}@example.test`,
            emailNormalized: `forecast${i}@example.test`,
            passwordHash: hash,
            roleId: role.id,
          },
        }),
      ),
    );
    adminId = users[0].id;
    const category = await prisma.category.create({
      data: { name: 'Test', nameNormalized: 'test', slug: 'test' },
    });
    productId = (
      await prisma.product.create({
        data: {
          sku: 'SKU1',
          skuNormalized: 'sku1',
          name: 'Test',
          slug: 'test',
          price: 1000,
          categoryId: category.id,
        },
      })
    ).id;
    const login = async (index: number) => {
      const agent = request.agent(app.getHttpServer());
      const result = await agent
        .post('/api/v1/auth/login')
        .send({
          email: `forecast${index}@example.test`,
          password: 'Password123',
        })
        .expect(200);
      return { agent, csrf: result.body.data.csrfToken as string };
    };
    admin = await login(0);
    stock = await login(1);
  });
  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_forecast_audit_trigger ON audit_logs; DROP FUNCTION IF EXISTS fail_forecast_audit();',
    );
    await prisma.forecastRun.deleteMany();
    await prisma.demandWeek.deleteMany();
    await prisma.forecastDataset.deleteMany();
    await app.close();
  });

  it('enforces role and CSRF and safely replays identical imports', async () => {
    await request(app.getHttpServer()).post(route).send(body()).expect(401);
    await stock.agent
      .post(route)
      .set('x-csrf-token', stock.csrf)
      .send(body())
      .expect(403);
    const sales = request.agent(app.getHttpServer());
    const login = await sales
      .post('/api/v1/auth/login')
      .send({ email: 'forecast2@example.test', password: 'Password123' })
      .expect(200);
    await sales.get(`/api/v1/forecasts?productId=${productId}`).expect(403);
    await sales.get(`/api/v1/recommendations/${productId}`).expect(403);
    await sales
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', login.body.data.csrfToken as string)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(403);
    await admin.agent.post(route).send(body()).expect(403);
    const first = await admin.agent
      .post(route)
      .set('x-csrf-token', admin.csrf)
      .send(body())
      .expect(201);
    expect(first.body.data).toMatchObject({ imported: 1, existing: 0 });
    const replay = await admin.agent
      .post(route)
      .set('x-csrf-token', admin.csrf)
      .send(body())
      .expect(201);
    expect(replay.body.data).toMatchObject({ imported: 0, existing: 1 });
    await admin.agent
      .post(route)
      .set('x-csrf-token', admin.csrf)
      .send({ ...body(), weeks: [{ ...row, quantity: '3' }] })
      .expect(409);
    expect(await prisma.demandWeek.count()).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: 'FORECAST_HISTORY_IMPORTED' },
      }),
    ).toBe(1);
  });

  it('rejects invalid dates, missing confirmation, duplicates and mass assignment', async () => {
    for (const value of [
      { ...body(), confirmedComplete: false },
      { ...body(), extra: true },
      { ...body(), weeks: [{ ...row, week: '2026-01-06' }] },
      { ...body(), weeks: [row, row] },
      { ...body(), weeks: [{ ...row, quantity: '-1' }] },
    ])
      await admin.agent
        .post(route)
        .set('x-csrf-token', admin.csrf)
        .send(value)
        .expect(400);
    expect(await prisma.demandWeek.count()).toBe(0);
  });

  it('rejects sales overlap and rolls back when audit fails', async () => {
    await prisma.stockMovement.create({
      data: {
        productId,
        type: 'SALE_OUT',
        action: 'CONFIRM_ORDER',
        quantity: '1',
        stockBefore: '2',
        stockAfter: '1',
        reasonCode: 'SALE',
        actorUserId: adminId,
        occurredAt: new Date('2026-01-06T01:00:00Z'),
        idempotencyKey: randomUUID(),
        payloadHash: 'b'.repeat(64),
      },
    });
    await admin.agent
      .post(route)
      .set('x-csrf-token', admin.csrf)
      .send(body())
      .expect(409);
    await prisma.stockMovement.deleteMany();
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION fail_forecast_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'FORECAST_HISTORY_IMPORTED' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_forecast_audit_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_forecast_audit();",
    );
    await admin.agent
      .post(route)
      .set('x-csrf-token', admin.csrf)
      .send(body())
      .expect(500);
    expect(await prisma.demandWeek.count()).toBe(0);
  });

  async function seedCompleteHistory(allPositive = false) {
    const now = new Date(Date.now() + 7 * 3600000);
    const day = now.getUTCDay() || 7;
    const currentMonday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - day + 1,
    );
    const last = currentMonday - 7 * 86400000;
    await prisma.product.update({
      where: { id: productId },
      data: { leadTimeDays: 7 },
    });
    await prisma.forecastDataset.create({
      data: {
        sourceHash: 'a'.repeat(64),
        productCount: 1,
        startWeek: new Date(last - 14 * 7 * 86400000),
        endWeek: new Date(last),
        unrecordedWeeks: [],
      },
    });
    await prisma.demandWeek.createMany({
      data: Array.from({ length: 15 }, (_, i) => ({
        productId,
        week: new Date(last - (14 - i) * 7 * 86400000),
        quantity: allPositive ? String((i % 4) + 1) : i % 2 ? '0' : '2',
        bazaar: false,
        miniBazaar: false,
        sourceHash: 'a'.repeat(64),
      })),
    });
  }

  async function waitForRun(id: string) {
    for (let i = 0; i < 800; i++) {
      const run = await prisma.forecastRun.findUniqueOrThrow({ where: { id } });
      if (run.status !== 'RUNNING') return run;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('forecast worker did not finish');
  }

  it('executes asynchronously and atomically applies verified output exactly once', async () => {
    await seedCompleteHistory();
    const payload = {
      productId,
      futureEvents: Array.from({ length: 4 }, () => ({
        bazaar: false,
        miniBazaar: false,
      })),
    };
    const key = randomUUID();
    await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', key)
      .send(payload)
      .expect(201)
      .then(async (response) => {
        const id = response.body.data.id as string;
        const result = await waitForRun(id);
        expect(result.status).toBe('SUCCESS');
        const product = await prisma.product.findUniqueOrThrow({
          where: { id: productId },
        });
        expect(product.safetyStock.toFixed(3)).toBe('1.235');
        expect(product.reorderPoint.toFixed(3)).toBe('3.457');
        await prisma.inventoryBalance.create({
          data: { productId, currentStock: '2' },
        });
        const recommendation = await stock.agent
          .get(`/api/v1/recommendations/${productId}`)
          .expect(200);
        expect(recommendation.body.data).toMatchObject({
          currentStock: '2.000',
          reorderPoint: '3.457',
          needsRestock: true,
          recommendedQuantity: null,
        });
        const restock = await stock.agent
          .get('/api/v1/recommendations/restock?page=1&limit=10')
          .expect(200);
        expect(restock.body.data.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              productId,
              needsRestock: true,
              recommendedQuantity: null,
            }),
          ]),
        );
        await stock.agent.get(`/api/v1/forecasts/${id}`).expect(200);
        await stock.agent
          .post('/api/v1/forecasts/runs')
          .set('x-csrf-token', stock.csrf)
          .set('idempotency-key', key)
          .send(payload)
          .expect(201)
          .then((again) => expect(again.body.data.id).toBe(id));
        expect(
          await prisma.auditLog.count({
            where: { action: 'FORECAST_RUN_COMPLETED' },
          }),
        ).toBe(1);
      });
  });

  it('keeps operational values unchanged when coverage is insufficient', async () => {
    const key = randomUUID();
    const result = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', key)
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    expect(result.body.data.status).toBe('INSUFFICIENT_DATA');
    const recommendation = await stock.agent
      .get(`/api/v1/recommendations/${productId}`)
      .expect(200);
    expect(recommendation.body.data).toMatchObject({
      needsRestock: null,
      safetyStock: null,
      reorderPoint: null,
      recommendedQuantity: null,
    });
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.reorderPoint.toFixed(3)).toBe('0.000');
    const id = result.body.data.id as string;
    await expect(
      prisma.$executeRaw`UPDATE forecast_runs SET status = 'RUNNING' WHERE id = ${id}::uuid`,
    ).rejects.toBeDefined();
  });

  it('does not run while a source dataset is only partly imported', async () => {
    await seedCompleteHistory();
    await prisma.forecastDataset.update({
      where: { sourceHash: 'a'.repeat(64) },
      data: { productCount: 2 },
    });
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    expect(response.body.data.status).toBe('INSUFFICIENT_DATA');
    const run = await prisma.forecastRun.findUniqueOrThrow({
      where: { id: response.body.data.id as string },
    });
    expect(run.result).toMatchObject({ reason: 'DATASET_INCOMPLETE' });
  });

  it('skips explicitly unrecorded notebook weeks without converting them to zero', async () => {
    await seedCompleteHistory();
    const rows = await prisma.demandWeek.findMany({
      where: { productId },
      orderBy: { week: 'asc' },
    });
    const missing = rows[6].week;
    await prisma.demandWeek.delete({
      where: { productId_week: { productId, week: missing } },
    });
    await prisma.forecastDataset.update({
      where: { sourceHash: 'a'.repeat(64) },
      data: { unrecordedWeeks: [missing.toISOString().slice(0, 10)] },
    });
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    const run = await waitForRun(response.body.data.id as string);
    expect(run.status).toBe('SUCCESS');
    const snapshot = run.inputSnapshot as {
      input: { weeks: { week: string }[]; knownMissingWeeks: string[] };
    };
    expect(snapshot.input.knownMissingWeeks).toContain(
      missing.toISOString().slice(0, 10),
    );
    expect(
      snapshot.input.weeks.some(
        (w) => w.week === missing.toISOString().slice(0, 10),
      ),
    ).toBe(false);
  });

  it('does not fill an unexplained missing product-week with zero', async () => {
    await seedCompleteHistory();
    const rows = await prisma.demandWeek.findMany({
      where: { productId },
      orderBy: { week: 'asc' },
    });
    await prisma.demandWeek.delete({
      where: { productId_week: { productId, week: rows[6].week } },
    });
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    expect(response.body.data.status).toBe('INSUFFICIENT_DATA');
    expect(
      (
        await prisma.forecastRun.findUniqueOrThrow({
          where: { id: response.body.data.id as string },
        })
      ).result,
    ).toMatchObject({ reason: 'COHORT_GAP' });
  });

  it('combines verified historical weeks with recorded sales and explicit events', async () => {
    await seedCompleteHistory();
    const last = await prisma.demandWeek.findFirstOrThrow({
      where: { productId },
      orderBy: { week: 'desc' },
    });
    await prisma.demandWeek.delete({
      where: { productId_week: { productId, week: last.week } },
    });
    await prisma.forecastDataset.update({
      where: { sourceHash: 'a'.repeat(64) },
      data: { endWeek: new Date(last.week.getTime() - 7 * 86400000) },
    });
    const week = last.week.toISOString().slice(0, 10);
    config.set('FORECAST_CAPTURE_START', week);
    await prisma.stockMovement.create({
      data: {
        productId,
        type: 'SALE_OUT',
        action: 'CONFIRM_ORDER',
        quantity: '1.500',
        stockBefore: '2',
        stockAfter: '0.500',
        reasonCode: 'SALE',
        actorUserId: adminId,
        occurredAt: new Date(last.week.getTime() + 86400000),
        idempotencyKey: randomUUID(),
        payloadHash: 'b'.repeat(64),
      },
    });
    const body = {
      productId,
      futureEvents: Array.from({ length: 4 }, () => ({
        bazaar: false,
        miniBazaar: false,
      })),
      observedEvents: [{ week, bazaar: true, miniBazaar: false }],
    };
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(body)
      .expect(201);
    const run = await waitForRun(response.body.data.id as string);
    expect(run.status).toBe('SUCCESS');
    const snapshot = run.inputSnapshot as {
      input: { weeks: { week: string; quantity: number; event: number[] }[] };
    };
    expect(snapshot.input.weeks.at(-1)).toEqual({
      week,
      quantity: 1.5,
      event: [1, 0],
    });
    config.set('FORECAST_CAPTURE_START', '');
  });

  it('does not treat an unknown event history as zero', async () => {
    await seedCompleteHistory();
    const last = await prisma.demandWeek.findFirstOrThrow({
      where: { productId },
      orderBy: { week: 'desc' },
    });
    await prisma.demandWeek.delete({
      where: { productId_week: { productId, week: last.week } },
    });
    await prisma.forecastDataset.update({
      where: { sourceHash: 'a'.repeat(64) },
      data: { endWeek: new Date(last.week.getTime() - 7 * 86400000) },
    });
    config.set('FORECAST_CAPTURE_START', last.week.toISOString().slice(0, 10));
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    expect(response.body.data.status).toBe('INSUFFICIENT_DATA');
    const run = await prisma.forecastRun.findUniqueOrThrow({
      where: { id: response.body.data.id as string },
    });
    expect(run.result).toMatchObject({ reason: 'EVENTS_MISSING' });
    config.set('FORECAST_CAPTURE_START', '');
  });

  it('includes other products’ recorded sales in the notebook pooled outlier factor', async () => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    const other = await prisma.product.create({
      data: {
        sku: 'SKU2',
        skuNormalized: 'sku2',
        name: 'Other',
        slug: 'other',
        price: 1000,
        categoryId: product.categoryId,
      },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { leadTimeDays: 7 },
    });
    const now = new Date(Date.now() + 7 * 3600000);
    const monday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - ((now.getUTCDay() || 7) - 1),
    );
    const first = monday - 15 * 7 * 86400000;
    const capture = first + 5 * 7 * 86400000;
    await prisma.forecastDataset.create({
      data: {
        sourceHash: 'a'.repeat(64),
        productCount: 2,
        startWeek: new Date(first),
        endWeek: new Date(capture - 7 * 86400000),
        unrecordedWeeks: [],
      },
    });
    config.set(
      'FORECAST_CAPTURE_START',
      new Date(capture).toISOString().slice(0, 10),
    );
    await prisma.demandWeek.createMany({
      data: [productId, other.id].flatMap((id) =>
        Array.from({ length: 5 }, (_, i) => ({
          productId: id,
          week: new Date(first + i * 7 * 86400000),
          quantity: id === other.id || i % 2 === 0 ? '2' : '0',
          bazaar: false,
          miniBazaar: false,
          sourceHash: 'a'.repeat(64),
        })),
      ),
    });
    const movements = Array.from({ length: 10 }, (_, i) => ({
      productId: other.id,
      type: 'SALE_OUT',
      action: 'CONFIRM_ORDER',
      quantity: '1',
      stockBefore: '2',
      stockAfter: '1',
      reasonCode: 'SALE',
      actorUserId: adminId,
      occurredAt: new Date(capture + i * 7 * 86400000 + 86400000),
      idempotencyKey: randomUUID(),
      payloadHash: 'c'.repeat(64),
    }));
    for (const i of [1, 4, 7])
      movements.push({
        ...movements[i],
        productId,
        idempotencyKey: randomUUID(),
      });
    await prisma.stockMovement.createMany({ data: movements });
    const observedEvents = Array.from({ length: 10 }, (_, i) => ({
      week: new Date(capture + i * 7 * 86400000).toISOString().slice(0, 10),
      bazaar: false,
      miniBazaar: false,
    }));
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        observedEvents,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    const run = await waitForRun(response.body.data.id as string);
    expect(run.status).toBe('SUCCESS');
    const snapshot = run.inputSnapshot as {
      input: { pooledOutlierMultiplier: number | null };
    };
    expect(snapshot.input.pooledOutlierMultiplier).not.toBeNull();
  });

  it('rolls back automatic values if completion audit fails', async () => {
    await seedCompleteHistory();
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION fail_forecast_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'FORECAST_RUN_COMPLETED' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_forecast_audit_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_forecast_audit();",
    );
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    const result = await waitForRun(response.body.data.id as string);
    expect(result.status).toBe('FAILED');
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.safetyStock.toFixed(3)).toBe('0.000');
    expect(product.reorderPoint.toFixed(3)).toBe('0.000');
  });

  it('does not apply stale results when the product changes during computation', async () => {
    await seedCompleteHistory();
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send({
        productId,
        futureEvents: Array.from({ length: 4 }, () => ({
          bazaar: false,
          miniBazaar: false,
        })),
      })
      .expect(201);
    await prisma.product.update({
      where: { id: productId },
      data: { leadTimeDays: 14 },
    });
    expect((await waitForRun(response.body.data.id as string)).status).toBe(
      'SUPERSEDED',
    );
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: productId } })
      ).reorderPoint.toFixed(3),
    ).toBe('0.000');
  });

  it('rejects another concurrent run for the same product', async () => {
    await seedCompleteHistory();
    const payload = {
      productId,
      futureEvents: Array.from({ length: 4 }, () => ({
        bazaar: false,
        miniBazaar: false,
      })),
    };
    const response = await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(payload)
      .expect(201);
    await stock.agent
      .post('/api/v1/forecasts/runs')
      .set('x-csrf-token', stock.csrf)
      .set('idempotency-key', randomUUID())
      .send(payload)
      .expect(409);
    expect((await waitForRun(response.body.data.id as string)).status).toBe(
      'SUCCESS',
    );
  });

  it.skipIf(!process.env.FARMSIGHT_TEST_PYTHON)(
    'runs the real Python notebook functions and persists their result',
    async () => {
      process.env.OPENBLAS_NUM_THREADS = '1';
      config.set('FORECAST_PYTHON_PATH', process.env.FARMSIGHT_TEST_PYTHON!);
      config.set(
        'FORECAST_WORKER_PATH',
        join(process.cwd(), 'forecast-worker/worker.py'),
      );
      await seedCompleteHistory(true);
      const response = await stock.agent
        .post('/api/v1/forecasts/runs')
        .set('x-csrf-token', stock.csrf)
        .set('idempotency-key', randomUUID())
        .send({
          productId,
          futureEvents: Array.from({ length: 4 }, () => ({
            bazaar: false,
            miniBazaar: false,
          })),
        })
        .expect(201);
      const run = await waitForRun(response.body.data.id as string);
      expect(run.status).toBe('SUCCESS');
      expect(run.result).toMatchObject({
        status: 'SUCCESS',
        serviceLevel: 0.95,
      });
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: productId },
      });
      expect(product.safetyStock.gte(0)).toBe(true);
      expect(product.reorderPoint.gte(0)).toBe(true);
    },
    60000,
  );
});
