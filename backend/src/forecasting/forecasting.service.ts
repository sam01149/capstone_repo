import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { stableJson } from '../orders/order.utils.js';
import { pagination } from '../catalog/catalog.utils.js';
import type { CreateForecastDto } from './dto/create-forecast.dto.js';
import {
  runForecastPipeline,
  type PipelineInput,
  type PipelineResult,
} from './pipeline-adapter.js';
import { prepareInput } from './prepare-input.js';

const VERSION = 'rania-f7debae-adapter-v1';
const hash = (value: unknown) =>
  createHash('sha256').update(stableJson(value)).digest('hex');
const MAX_AGE = 3 * 60 * 1000;

@Injectable()
export class ForecastingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async expireStale() {
    const deadline = new Date(Date.now() - MAX_AGE);
    const stale = await this.prisma.forecastRun.findMany({
      where: {
        status: 'RUNNING',
        createdAt: { lt: deadline },
      },
      select: { id: true, productId: true, actorUserId: true },
      take: 100,
    });
    for (const run of stale)
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.forecastRun.updateMany({
          where: { id: run.id, status: 'RUNNING', createdAt: { lt: deadline } },
          data: { status: 'FAILED', completedAt: new Date() },
        });
        if (changed.count)
          await tx.auditLog.create({
            data: {
              actorUserId: run.actorUserId,
              action: 'FORECAST_RUN_EXPIRED',
              targetType: 'PRODUCT',
              targetId: run.productId,
              safeMetadata: { runId: run.id },
            },
          });
      });
  }

  async create(
    actor: AuthPrincipal,
    dto: CreateForecastDto,
    key: string | undefined,
    requestId: string,
  ) {
    if (!key || !isUUID(key))
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_INVALID',
        'Kunci permintaan tidak valid.',
      );
    await this.expireStale();
    const requestHash = hash(dto);
    const captureStart = this.config.get<string>('FORECAST_CAPTURE_START');
    const started = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('farmsight_forecast_runs'))::text`;
      const replay = await tx.forecastRun.findUnique({
        where: {
          actorUserId_idempotencyKey: {
            actorUserId: actor.userId,
            idempotencyKey: key,
          },
        },
      });
      if (replay) {
        if (replay.requestHash !== requestHash)
          throw new ApiError(
            HttpStatus.CONFLICT,
            'IDEMPOTENCY_CONFLICT',
            'Kunci permintaan sudah digunakan untuk data berbeda.',
          );
        return { run: replay, work: null };
      }
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${dto.productId}::uuid FOR UPDATE`;
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          isActive: true,
          leadTimeDays: true,
          updatedAt: true,
        },
      });
      if (!product)
        throw new ApiError(
          HttpStatus.NOT_FOUND,
          'PRODUCT_NOT_FOUND',
          'Produk tidak ditemukan.',
        );
      if (!product.isActive)
        throw new ApiError(
          HttpStatus.CONFLICT,
          'PRODUCT_INACTIVE',
          'Produk tidak aktif.',
        );
      if (
        await tx.forecastRun.count({
          where: { status: 'RUNNING', productId: dto.productId },
        })
      )
        throw new ApiError(
          HttpStatus.CONFLICT,
          'FORECAST_ALREADY_RUNNING',
          'Analisis produk sedang berjalan.',
        );
      if ((await tx.forecastRun.count({ where: { status: 'RUNNING' } })) >= 2)
        throw new ApiError(
          HttpStatus.TOO_MANY_REQUESTS,
          'FORECAST_BUSY',
          'Analisis sedang sibuk. Coba lagi nanti.',
        );
      const prepared = await prepareInput(
        tx,
        dto.productId,
        product.leadTimeDays,
        dto,
        captureStart,
        new Date(),
      );
      const snapshot = {
        input: prepared.input,
        reason: prepared.reason ?? null,
        captureStart: captureStart ?? null,
        productUpdatedAt: product.updatedAt.toISOString(),
        dto,
      };
      const status = prepared.input ? 'RUNNING' : 'INSUFFICIENT_DATA';
      const run = await tx.forecastRun.create({
        data: {
          productId: product.id,
          actorUserId: actor.userId,
          idempotencyKey: key,
          requestHash,
          status,
          inputHash: hash(snapshot),
          inputSnapshot: JSON.parse(
            stableJson(snapshot),
          ) as Prisma.InputJsonValue,
          modelVersion: VERSION,
          result: prepared.input
            ? undefined
            : { status, reason: prepared.reason ?? 'INSUFFICIENT_DATA' },
          completedAt: prepared.input ? undefined : new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'FORECAST_RUN_CREATED',
          targetType: 'PRODUCT',
          targetId: product.id,
          requestId,
          safeMetadata: { runId: run.id, status },
        },
      });
      return {
        run,
        work: prepared.input ? { input: prepared.input, snapshot } : null,
      };
    });
    if (started.work) {
      const work = started.work;
      setImmediate(() => {
        void this.execute(
          started.run.id,
          actor.userId,
          requestId,
          work.input,
          dto,
          work.snapshot.productUpdatedAt,
          captureStart,
        );
      });
    }
    return {
      id: started.run.id,
      productId: started.run.productId,
      status: started.run.status,
      createdAt: started.run.createdAt,
    };
  }

  private async execute(
    runId: string,
    actorId: string,
    requestId: string,
    input: PipelineInput,
    dto: CreateForecastDto,
    productUpdatedAt: string,
    captureStart: string | undefined,
  ) {
    try {
      const python =
        this.config.get<string>('FORECAST_PYTHON_PATH') || 'python';
      const script =
        this.config.get<string>('FORECAST_WORKER_PATH') ||
        join(process.cwd(), 'forecast-worker', 'worker.py');
      const result = await runForecastPipeline(python, script, input);
      await this.finish(
        runId,
        actorId,
        requestId,
        input,
        dto,
        productUpdatedAt,
        captureStart,
        result,
      );
    } catch {
      await this.prisma
        .$transaction(async (tx) => {
          const changed = await tx.forecastRun.updateMany({
            where: { id: runId, status: 'RUNNING' },
            data: { status: 'FAILED', completedAt: new Date() },
          });
          if (changed.count)
            await tx.auditLog.create({
              data: {
                actorUserId: actorId,
                action: 'FORECAST_RUN_FAILED',
                targetType: 'PRODUCT',
                targetId: dto.productId,
                requestId,
                safeMetadata: { runId },
              },
            });
        })
        .catch(() => undefined);
    }
  }

  private async finish(
    runId: string,
    actorId: string,
    requestId: string,
    input: PipelineInput,
    dto: CreateForecastDto,
    productUpdatedAt: string,
    captureStart: string | undefined,
    result: PipelineResult,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('farmsight_forecast_runs'))::text`;
      await tx.$queryRaw`SELECT id FROM forecast_runs WHERE id = ${runId}::uuid FOR UPDATE`;
      const run = await tx.forecastRun.findUnique({ where: { id: runId } });
      if (!run || run.status !== 'RUNNING') return;
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${run.productId}::uuid FOR UPDATE`;
      const product = await tx.product.findUnique({
        where: { id: run.productId },
        select: { isActive: true, leadTimeDays: true, updatedAt: true },
      });
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        include: { role: true },
      });
      const active =
        actor?.isActive &&
        ['SUPER_ADMIN', 'STOCK_MANAGER'].includes(actor.role.code);
      const fresh =
        product &&
        active &&
        product.isActive &&
        product.updatedAt.toISOString() === productUpdatedAt &&
        (this.config.get<string>('FORECAST_CAPTURE_START') ?? undefined) ===
          captureStart
          ? await prepareInput(
              tx,
              run.productId,
              product.leadTimeDays,
              dto,
              captureStart,
              new Date(),
            )
          : null;
      if (!fresh?.input || hash(fresh.input) !== hash(input)) {
        await tx.forecastRun.update({
          where: { id: runId },
          data: { status: 'SUPERSEDED', completedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: 'FORECAST_RUN_SUPERSEDED',
            targetType: 'PRODUCT',
            targetId: run.productId,
            requestId,
            safeMetadata: { runId },
          },
        });
        return;
      }
      if (result.status === 'SUCCESS') {
        const safety = new Prisma.Decimal(result.safetyStock).toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_CEIL,
        );
        const reorder = new Prisma.Decimal(result.reorderPoint).toDecimalPlaces(
          3,
          Prisma.Decimal.ROUND_CEIL,
        );
        if (safety.gt('999999999999.999') || reorder.gt('999999999999.999'))
          throw new Error('result overflow');
        await tx.product.update({
          where: { id: run.productId },
          data: { safetyStock: safety, reorderPoint: reorder },
        });
      }
      await tx.forecastRun.update({
        where: { id: runId },
        data: {
          status: result.status,
          result: result as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: 'FORECAST_RUN_COMPLETED',
          targetType: 'PRODUCT',
          targetId: run.productId,
          requestId,
          safeMetadata: { runId, status: result.status },
        },
      });
    });
  }

  async detail(id: string) {
    await this.expireStale();
    const run = await this.prisma.forecastRun.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        status: true,
        modelVersion: true,
        result: true,
        createdAt: true,
        completedAt: true,
      },
    });
    if (!run)
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'FORECAST_NOT_FOUND',
        'Analisis tidak ditemukan.',
      );
    return run;
  }

  async list(productId: string) {
    await this.expireStale();
    return this.prisma.forecastRun.findMany({
      where: { productId },
      take: 50,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        productId: true,
        status: true,
        modelVersion: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  async recommendation(productId: string) {
    await this.expireStale();
    const [product, latest, success, newestHistory] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          isActive: true,
          safetyStock: true,
          reorderPoint: true,
          updatedAt: true,
          inventoryBalance: { select: { currentStock: true, updatedAt: true } },
        },
      }),
      this.prisma.forecastRun.findFirst({
        where: { productId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { status: true, createdAt: true },
      }),
      this.prisma.forecastRun.findFirst({
        where: { productId, status: 'SUCCESS' },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          completedAt: true,
          inputSnapshot: true,
          result: true,
        },
      }),
      this.prisma.demandWeek.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    if (!product)
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'PRODUCT_NOT_FOUND',
        'Produk tidak ditemukan.',
      );
    const snapshot = success?.inputSnapshot as
      { input?: { weeks?: { week?: string }[] } } | undefined;
    const dataThrough = snapshot?.input?.weeks?.at(-1)?.week ?? null;
    const modelResult = success?.result as
      | {
          convergenceWarning?: boolean;
          invalidTuningCandidates?: number | null;
          fallbackDuringTuning?: boolean;
          fallbackDuringEvaluation?: boolean;
          fallbackDuringForecast?: boolean;
        }
      | undefined;
    const localNow = new Date(Date.now() + 7 * 3600000);
    const day = localNow.getUTCDay() || 7;
    const currentMonday = Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() - day + 1,
    );
    const latestCompletedWeek = new Date(currentMonday - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const stale =
      !!success &&
      (dataThrough !== latestCompletedWeek ||
        (!!latest &&
          latest.createdAt > success.completedAt! &&
          latest.status !== 'SUCCESS') ||
        (!!newestHistory && newestHistory.createdAt > success.completedAt!) ||
        product.updatedAt > success.completedAt!);
    const current = product.inventoryBalance?.currentStock;
    return {
      productId,
      analysisStatus: latest?.status ?? 'NOT_AVAILABLE',
      lastSuccessfulRunId: success?.id ?? null,
      generatedAt: success?.completedAt ?? null,
      dataThrough,
      modelWarnings: success
        ? {
            convergenceWarning: modelResult?.convergenceWarning === true,
            invalidTuningCandidates:
              modelResult?.invalidTuningCandidates ?? null,
            fallbackDuringTuning: modelResult?.fallbackDuringTuning === true,
            fallbackDuringEvaluation:
              modelResult?.fallbackDuringEvaluation === true,
            fallbackDuringForecast:
              modelResult?.fallbackDuringForecast === true,
          }
        : null,
      stale,
      stockAsOf: product.inventoryBalance?.updatedAt ?? null,
      currentStock: current?.toFixed(3) ?? null,
      safetyStock: success ? product.safetyStock.toFixed(3) : null,
      reorderPoint: success ? product.reorderPoint.toFixed(3) : null,
      needsRestock:
        success && product.isActive && current
          ? current.lte(product.reorderPoint)
          : null,
      recommendedQuantity: null,
      message: !success
        ? 'Rekomendasi belum tersedia.'
        : !product.isActive
          ? 'Produk tidak aktif.'
          : !current
            ? 'Saldo stok belum tersedia.'
            : current.lte(product.reorderPoint)
              ? 'Stok mencapai batas pemesanan kembali.'
              : 'Stok berada di atas batas pemesanan kembali.',
    };
  }

  async restockList(page: number, limit: number) {
    const predicate = Prisma.sql`FROM products p JOIN inventory_balances b ON b.product_id = p.id
      WHERE p.is_active = true AND b.current_stock <= p.reorder_point
      AND EXISTS (SELECT 1 FROM forecast_runs f WHERE f.product_id = p.id AND f.status = 'SUCCESS')`;
    const [ids, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        { id: string }[]
      >`SELECT p.id ${predicate} ORDER BY p.name, p.id LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<
        { total: bigint }[]
      >`SELECT COUNT(*) AS total ${predicate}`,
    ]);
    return {
      items: await Promise.all(ids.map(({ id }) => this.recommendation(id))),
      pagination: pagination(page, limit, Number(count[0].total)),
    };
  }
}
