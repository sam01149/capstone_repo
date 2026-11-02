import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/http/api-error.js';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { decimal } from '../inventory/decimal.utils.js';
import type { ImportHistoryDto } from './dto/import-history.dto.js';

@Injectable()
export class ForecastHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async importHistory(
    actor: AuthPrincipal,
    dto: ImportHistoryDto,
    requestId: string,
  ) {
    const parseWeek = (value: string) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value ||
        parsed.getUTCDay() !== 1
      )
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'FORECAST_HISTORY_INVALID',
          'Kalender histori tidak valid.',
        );
      return parsed;
    };
    const start = parseWeek(dto.sourceStartWeek);
    const end = parseWeek(dto.sourceEndWeek);
    if (
      start > end ||
      (end.getTime() - start.getTime()) / (7 * 86400000) >= 1000 ||
      end.getTime() + 7 * 86400000 > Date.now()
    )
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'FORECAST_HISTORY_INVALID',
        'Rentang kalender histori tidak valid.',
      );
    const unrecorded = [...dto.unrecordedWeeks].sort();
    for (const missing of unrecorded) {
      const value = parseWeek(missing);
      if (value < start || value > end)
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'FORECAST_HISTORY_INVALID',
          'Minggu tidak tercatat berada di luar rentang sumber.',
        );
    }
    const seen = new Set<string>();
    const rows = dto.weeks.map((row) => {
      const week = new Date(`${row.week}T00:00:00.000Z`);
      if (
        !Number.isFinite(week.getTime()) ||
        week.toISOString().slice(0, 10) !== row.week ||
        week.getUTCDay() !== 1 ||
        week.getTime() + 7 * 86400000 > Date.now() ||
        week < start ||
        week > end ||
        unrecorded.includes(row.week) ||
        seen.has(row.week)
      ) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'FORECAST_HISTORY_INVALID',
          'Minggu histori tidak valid atau belum selesai.',
        );
      }
      seen.add(row.week);
      return {
        productId: dto.productId,
        week,
        quantity: decimal(row.quantity),
        bazaar: row.bazaar,
        miniBazaar: row.miniBazaar,
        sourceHash: dto.sourceHash,
      };
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('farmsight_forecast_runs'))::text`;
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${dto.productId}::uuid FOR UPDATE`;
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      });
      if (!product)
        throw new ApiError(
          HttpStatus.NOT_FOUND,
          'PRODUCT_NOT_FOUND',
          'Produk tidak ditemukan.',
        );
      const dataset = await tx.forecastDataset.findUnique({
        where: { sourceHash: dto.sourceHash },
      });
      if (
        dataset &&
        (dataset.productCount !== dto.sourceProductCount ||
          dataset.startWeek?.getTime() !== start.getTime() ||
          dataset.endWeek?.getTime() !== end.getTime() ||
          JSON.stringify(dataset.unrecordedWeeks) !==
            JSON.stringify(unrecorded))
      )
        throw new ApiError(
          HttpStatus.CONFLICT,
          'FORECAST_DATASET_CONFLICT',
          'Jumlah produk dalam sumber histori tidak sesuai.',
        );
      if (!dataset)
        await tx.forecastDataset.create({
          data: {
            sourceHash: dto.sourceHash,
            productCount: dto.sourceProductCount,
            startWeek: start,
            endWeek: end,
            unrecordedWeeks: unrecorded,
          },
        });
      const overlapping = await tx.$queryRaw<{ found: number }[]>`
        SELECT 1 AS found FROM stock_movements
        WHERE product_id = ${dto.productId}::uuid AND type = 'SALE_OUT'
          AND date_trunc('week', occurred_at AT TIME ZONE 'Asia/Jakarta')::date
            IN (${Prisma.join(rows.map((row) => Prisma.sql`${row.week}::date`))}) LIMIT 1`;
      if (overlapping.length)
        throw new ApiError(
          HttpStatus.CONFLICT,
          'FORECAST_HISTORY_OVERLAP',
          'Histori bertumpang tindih dengan penjualan yang sudah tercatat.',
        );
      const existing = await tx.demandWeek.findMany({
        where: {
          productId: dto.productId,
          week: { in: rows.map((x) => x.week) },
        },
      });
      const indexed = new Map(
        existing.map((row) => [row.week.toISOString().slice(0, 10), row]),
      );
      for (const row of rows) {
        const old = indexed.get(row.week.toISOString().slice(0, 10));
        if (
          old &&
          (!old.quantity.equals(row.quantity) ||
            old.bazaar !== row.bazaar ||
            old.miniBazaar !== row.miniBazaar ||
            old.sourceHash !== row.sourceHash)
        ) {
          throw new ApiError(
            HttpStatus.CONFLICT,
            'FORECAST_HISTORY_CONFLICT',
            'Histori untuk minggu tersebut sudah ada dan berbeda.',
          );
        }
      }
      const fresh = rows.filter(
        (row) => !indexed.has(row.week.toISOString().slice(0, 10)),
      );
      if (fresh.length) {
        await tx.demandWeek.createMany({ data: fresh });
        const products = await tx.demandWeek.groupBy({
          by: ['productId'],
          where: { sourceHash: dto.sourceHash },
        });
        if (products.length > dto.sourceProductCount)
          throw new ApiError(
            HttpStatus.CONFLICT,
            'FORECAST_DATASET_CONFLICT',
            'Jumlah produk melebihi sumber histori.',
          );
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'FORECAST_HISTORY_IMPORTED',
            targetType: 'PRODUCT',
            targetId: dto.productId,
            requestId,
            safeMetadata: { sourceHash: dto.sourceHash, count: fresh.length },
          },
        });
      }
      return {
        productId: dto.productId,
        imported: fresh.length,
        existing: rows.length - fresh.length,
      };
    });
  }
}
