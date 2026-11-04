import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { pagination } from '../catalog/catalog.utils.js';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { decimal, decimalString } from './decimal.utils.js';
import type { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import type { ListInventoryQueryDto } from './dto/list-inventory-query.dto.js';
import type { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto.js';
import {
  STOCK_UNIT_LABELS,
  type MovementAction,
  type MovementType,
  type StockStatus,
  type StockUnit,
} from './inventory.constants.js';

const movementInclude = {
  product: { select: { id: true, sku: true, name: true, stockUnit: true } },
  actor: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementRecord = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListInventoryQueryDto) {
    const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.search) {
      const search = `%${query.search}%`;
      clauses.push(
        Prisma.sql`(p.name ILIKE ${search} OR p.sku_normalized ILIKE ${search})`,
      );
    }
    if (query.categoryId) {
      clauses.push(Prisma.sql`p.category_id = ${query.categoryId}::uuid`);
    }
    if (query.isActive !== undefined) {
      clauses.push(Prisma.sql`p.is_active = ${query.isActive}`);
    }
    if (query.stockStatus === 'OUT_OF_STOCK') {
      clauses.push(Prisma.sql`b.current_stock = 0`);
    } else if (query.stockStatus === 'LOW') {
      clauses.push(
        Prisma.sql`b.current_stock > 0 AND b.current_stock <= p.reorder_point`,
      );
    } else if (query.stockStatus === 'AVAILABLE') {
      clauses.push(Prisma.sql`b.current_stock > p.reorder_point`);
    }

    const sortColumns = {
      updatedAt: 'b.updated_at',
      name: 'p.name',
      sku: 'p.sku_normalized',
      currentStock: 'b.current_stock',
    } as const;
    const orderBy = Prisma.raw(sortColumns[query.sort]);
    const order = Prisma.raw(query.order.toUpperCase());
    const filter = Prisma.join(clauses, ' AND ');
    const offset = (query.page - 1) * query.limit;
    const [idRows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id
        FROM products p
        JOIN inventory_balances b ON b.product_id = p.id
        WHERE ${filter}
        ORDER BY ${orderBy} ${order}, p.id ASC
        LIMIT ${query.limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*)::bigint AS total
        FROM products p
        JOIN inventory_balances b ON b.product_id = p.id
        WHERE ${filter}
      `,
    ]);
    const ids = idRows.map((row) => row.id);
    const products = ids.length
      ? await this.prisma.product.findMany({
          where: { id: { in: ids } },
          include: {
            category: { select: { id: true, name: true } },
            inventoryBalance: true,
          },
        })
      : [];
    const byId = new Map(
      products.map((product) => [
        product.id,
        this.toInventoryResponse(product),
      ]),
    );
    const total = Number(countRows[0]?.total ?? 0n);
    return {
      items: ids.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      }),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async findOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
        inventoryBalance: true,
      },
    });
    if (!product) throw this.inventoryNotFound();
    return this.toInventoryResponse(product);
  }

  async listMovements(query: ListStockMovementsQueryDto) {
    const where: Prisma.StockMovementWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;
    if (query.action) where.action = query.action;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.occurredFrom || query.occurredTo) {
      const from = query.occurredFrom
        ? new Date(query.occurredFrom)
        : undefined;
      const to = query.occurredTo ? new Date(query.occurredTo) : undefined;
      if (from && to && from > to) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Awal rentang waktu tidak boleh setelah akhirnya.',
        );
      }
      where.occurredAt = { gte: from, lte: to };
    }
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      items: records.map((record) => this.toMovementResponse(record)),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async createMovement(
    actor: AuthPrincipal,
    dto: CreateStockMovementDto,
    idempotencyKey: string | undefined,
    requestId: string,
  ) {
    this.assertIdempotencyKey(idempotencyKey);
    const key = idempotencyKey as string;
    const canonicalPayload = Object.fromEntries(
      Object.entries(dto)
        .filter(([, value]) => value !== undefined)
        .sort(([left], [right]) => left.localeCompare(right)),
    );
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');

    try {
      return await this.runSerializable(async (tx) => {
        const replay = await tx.stockMovement.findUnique({
          where: {
            actorUserId_idempotencyKey: {
              actorUserId: actor.userId,
              idempotencyKey: key,
            },
          },
          include: movementInclude,
        });
        if (replay) return this.replayOrThrow(replay, payloadHash);

        await tx.$queryRaw`SELECT product_id FROM inventory_balances WHERE product_id = ${dto.productId}::uuid FOR UPDATE`;
        const product = await tx.product.findUnique({
          where: { id: dto.productId },
          include: { inventoryBalance: true },
        });
        if (!product?.inventoryBalance) throw this.inventoryNotFound();

        const occurredAt = dto.occurredAt
          ? new Date(dto.occurredAt)
          : new Date();
        this.assertTiming(actor, occurredAt, dto);
        this.assertReason(dto);

        const before = product.inventoryBalance.currentStock;
        const change = this.calculateChange(dto, before);
        const after = before.plus(change.delta);
        if (after.isNegative()) {
          throw new ApiError(
            HttpStatus.CONFLICT,
            'INSUFFICIENT_STOCK',
            'Stok tidak mencukupi untuk tindakan ini.',
          );
        }
        this.assertProductState(product.isActive, dto.action, change.delta);

        if (dto.action === 'SET_OPENING_BALANCE') {
          const movementCount = await tx.stockMovement.count({
            where: { productId: product.id },
          });
          if (movementCount > 0 || !before.isZero()) {
            throw new ApiError(
              HttpStatus.CONFLICT,
              'OPENING_BALANCE_ALREADY_SET',
              'Saldo awal hanya dapat dicatat sebelum ada pergerakan stok.',
            );
          }
        }

        await tx.inventoryBalance.update({
          where: { productId: product.id },
          data: { currentStock: after, version: { increment: 1 } },
        });
        const movement = await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: change.type,
            action: dto.action,
            quantity: change.quantity,
            stockBefore: before,
            stockAfter: after,
            reasonCode: dto.reasonCode,
            note: dto.note || null,
            referenceType: dto.referenceType ?? null,
            referenceId: dto.referenceId ?? null,
            idempotencyKey: key,
            payloadHash,
            actorUserId: actor.userId,
            occurredAt,
          },
          include: movementInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'STOCK_MOVEMENT_CREATED',
            targetType: 'STOCK_MOVEMENT',
            targetId: movement.id,
            requestId,
            safeMetadata: {
              productId: product.id,
              movementType: change.type,
              movementAction: dto.action,
            },
          },
        });
        return this.toMovementResponse(movement);
      });
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        const replay = await this.prisma.stockMovement.findUnique({
          where: {
            actorUserId_idempotencyKey: {
              actorUserId: actor.userId,
              idempotencyKey: key,
            },
          },
          include: movementInclude,
        });
        if (replay) return this.replayOrThrow(replay, payloadHash);
      }
      throw error;
    }
  }

  private calculateChange(dto: CreateStockMovementDto, before: Prisma.Decimal) {
    if (dto.action === 'ADJUST_TO_PHYSICAL') {
      if (dto.quantity !== undefined) this.invalidMovementFields();
      const target = decimal(dto.physicalCount as string);
      const delta = target.minus(before);
      if (delta.isZero()) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'MOVEMENT_NO_CHANGE',
          'Stok fisik sama dengan saldo saat ini.',
        );
      }
      return {
        delta,
        quantity: delta.abs(),
        type: (delta.isPositive()
          ? 'ADJUSTMENT_IN'
          : 'ADJUSTMENT_OUT') as MovementType,
      };
    }

    if (dto.physicalCount !== undefined) this.invalidMovementFields();

    const quantity = decimal(dto.quantity as string);
    if (quantity.isZero()) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'INVALID_STOCK_PRECISION',
        'Kuantitas harus lebih dari nol.',
      );
    }
    const typeByAction: Record<
      Exclude<MovementAction, 'ADJUST_TO_PHYSICAL'>,
      MovementType
    > = {
      SET_OPENING_BALANCE: 'IN',
      ADD_STOCK: 'IN',
      REDUCE_STOCK: 'OUT',
      MARK_DAMAGED: 'DAMAGED',
      MARK_EXPIRED: 'EXPIRED',
      RETURN_CUSTOMER: 'RETURN_IN',
    };
    const type = typeByAction[dto.action];
    const incoming = [
      'SET_OPENING_BALANCE',
      'ADD_STOCK',
      'RETURN_CUSTOMER',
    ].includes(dto.action);
    return { delta: incoming ? quantity : quantity.negated(), quantity, type };
  }

  private assertReason(dto: CreateStockMovementDto) {
    const allowed: Record<MovementAction, readonly string[]> = {
      SET_OPENING_BALANCE: ['OPENING_BALANCE'],
      ADD_STOCK: ['PURCHASE', 'RESTOCK', 'OTHER'],
      REDUCE_STOCK: ['MANUAL_REDUCTION', 'OTHER'],
      ADJUST_TO_PHYSICAL: ['PHYSICAL_COUNT', 'OTHER'],
      MARK_DAMAGED: ['DAMAGED'],
      MARK_EXPIRED: ['EXPIRED'],
      RETURN_CUSTOMER: ['CUSTOMER_RETURN'],
    };
    if (!allowed[dto.action].includes(dto.reasonCode)) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Alasan tidak sesuai dengan tindakan stok.',
      );
    }
    const actionsRequiringNote: MovementAction[] = [
      'REDUCE_STOCK',
      'ADJUST_TO_PHYSICAL',
      'MARK_DAMAGED',
      'MARK_EXPIRED',
      'RETURN_CUSTOMER',
    ];
    if (
      (dto.reasonCode === 'OTHER' ||
        actionsRequiringNote.includes(dto.action)) &&
      !dto.note
    ) {
      this.noteRequired();
    }
    if ((dto.referenceType === undefined) !== (dto.referenceId === undefined)) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Jenis dan ID referensi harus diisi bersama.',
      );
    }
  }

  private assertTiming(
    actor: AuthPrincipal,
    occurredAt: Date,
    dto: CreateStockMovementDto,
  ) {
    const now = Date.now();
    if (occurredAt.getTime() > now + 1_000) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'FUTURE_MOVEMENT_NOT_ALLOWED',
        'Waktu pergerakan stok tidak boleh berada di masa depan.',
      );
    }
    if (dto.occurredAt !== undefined && actor.role !== ROLE_CODES.SUPER_ADMIN) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'BACKDATE_FORBIDDEN',
        'Hanya Super Admin yang boleh menentukan waktu pergerakan stok.',
      );
    }
    const isBackdated =
      dto.occurredAt !== undefined && occurredAt.getTime() < now - 60_000;
    if (isBackdated && !dto.note) this.noteRequired();
  }

  private assertProductState(
    isActive: boolean,
    action: MovementAction,
    delta: Prisma.Decimal,
  ) {
    if (isActive) return;
    const allowed =
      ['MARK_DAMAGED', 'MARK_EXPIRED'].includes(action) ||
      (action === 'ADJUST_TO_PHYSICAL' && delta.isNegative());
    if (!allowed) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'PRODUCT_INACTIVE_FOR_MOVEMENT',
        'Produk tidak aktif hanya boleh ditandai rusak, kedaluwarsa, atau disesuaikan turun.',
      );
    }
  }

  private toInventoryResponse(
    product: Prisma.ProductGetPayload<{
      include: {
        category: { select: { id: true; name: true } };
        inventoryBalance: true;
      };
    }>,
  ) {
    const currentStock = product.inventoryBalance?.currentStock ?? decimal(0);
    const stockStatus: StockStatus = currentStock.isZero()
      ? 'OUT_OF_STOCK'
      : currentStock.lessThanOrEqualTo(product.reorderPoint)
        ? 'LOW'
        : 'AVAILABLE';
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      isActive: product.isActive,
      stockUnit: product.stockUnit,
      stockUnitLabel: STOCK_UNIT_LABELS[product.stockUnit as StockUnit],
      currentStock: decimalString(currentStock),
      minimumStock: decimalString(product.minimumStock),
      safetyStock: decimalString(product.safetyStock),
      reorderPoint: decimalString(product.reorderPoint),
      stockStatus,
      updatedAt: (
        product.inventoryBalance?.updatedAt ?? product.updatedAt
      ).toISOString(),
    };
  }

  private toMovementResponse(movement: MovementRecord) {
    return {
      id: movement.id,
      product: {
        ...movement.product,
        stockUnitLabel:
          STOCK_UNIT_LABELS[movement.product.stockUnit as StockUnit],
      },
      type: movement.type,
      action: movement.action,
      quantity: decimalString(movement.quantity),
      stockBefore: decimalString(movement.stockBefore),
      stockAfter: decimalString(movement.stockAfter),
      reasonCode: movement.reasonCode,
      note: movement.note,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      actor: movement.actor,
      occurredAt: movement.occurredAt.toISOString(),
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private replayOrThrow(movement: MovementRecord, payloadHash: string) {
    if (movement.payloadHash !== payloadHash) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_KEY_REUSED',
        'Kunci idempotensi sudah digunakan untuk payload yang berbeda.',
      );
    }
    return this.toMovementResponse(movement);
  }

  private assertIdempotencyKey(key: string | undefined) {
    if (!key) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Header Idempotency-Key wajib diisi.',
      );
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    ) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_INVALID',
        'Header Idempotency-Key harus berupa UUID v4.',
      );
    }
  }

  private noteRequired(): never {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'MOVEMENT_NOTE_REQUIRED',
      'Catatan wajib diisi untuk tindakan ini.',
    );
  }

  private invalidMovementFields(): never {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Gunakan physicalCount hanya untuk penyesuaian fisik dan quantity untuk tindakan lainnya.',
    );
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (attempt < 3 && this.isTransactionConflict(error)) continue;
        if (this.isTransactionConflict(error)) {
          throw new ApiError(
            HttpStatus.CONFLICT,
            'INVENTORY_CONFLICT',
            'Stok berubah bersamaan. Silakan ulangi tindakan.',
          );
        }
        throw error;
      }
    }
    throw new Error('Retry transaksi tidak menghasilkan keputusan.');
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }

  private isTransactionConflict(error: unknown): boolean {
    if (this.hasPrismaCode(error, 'P2034')) return true;
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (candidate.code === '40001' || candidate.code === '40P01') return true;
    if (
      typeof candidate.message === 'string' &&
      /(serialization|write conflict|deadlock|could not serialize)/i.test(
        candidate.message,
      )
    ) {
      return true;
    }
    return candidate.cause !== undefined
      ? this.isTransactionConflict(candidate.cause)
      : false;
  }

  private inventoryNotFound() {
    return new ApiError(
      HttpStatus.NOT_FOUND,
      'INVENTORY_NOT_FOUND',
      'Data inventaris produk tidak ditemukan.',
    );
  }
}
