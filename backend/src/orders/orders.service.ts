import { createHash, randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pagination } from '../catalog/catalog.utils.js';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { decimal, decimalString } from '../inventory/decimal.utils.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { CreatePublicDraftDto } from './dto/create-public-draft.dto.js';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import type { OrderItemDto } from './dto/order-item.dto.js';
import type { UpdateOrderDto } from './dto/update-order.dto.js';
import type { OrderAction, OrderStatus } from './order.constants.js';
import { DRAFT_TTL_MS, PII_RETENTION_MS } from './order.constants.js';
import {
  buildWhatsAppMessage,
  createPublicCode,
  stableJson,
} from './order.utils.js';

const orderInclude = {
  items: {
    orderBy: { id: 'asc' as const },
    include: { stockMovement: { select: { id: true } } },
  },
  createdBy: { select: { id: true, name: true } },
  confirmedBy: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createPublic(
    dto: CreatePublicDraftDto,
    key: string | undefined,
    requestId: string,
  ) {
    const number = this.config.get<string>('WHATSAPP_BUSINESS_NUMBER');
    if (!number)
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'WHATSAPP_NOT_CONFIGURED',
        'Layanan WhatsApp belum dikonfigurasi.',
      );
    const order = await this.create(
      null,
      'PUBLIC_WHATSAPP',
      dto,
      key,
      requestId,
    );
    const message = buildWhatsAppMessage(order);
    return {
      ...this.map(order, false),
      whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    };
  }

  async createInternal(
    actor: AuthPrincipal,
    dto: CreateOrderDto,
    key: string | undefined,
    requestId: string,
  ) {
    return this.map(
      await this.create(actor, 'INTERNAL', dto, key, requestId),
      true,
    );
  }

  async list(query: ListOrdersQueryDto) {
    await this.maintenance();
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.search)
      where.OR = [
        { publicCode: { contains: query.search.toUpperCase() } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
      ];
    if (query.createdFrom || query.createdTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.createdFrom) createdAt.gte = new Date(query.createdFrom);
      if (query.createdTo) createdAt.lte = new Date(query.createdTo);
      if (createdAt.gte && createdAt.lte && createdAt.gte > createdAt.lte) {
        throw new ApiError(
          400,
          'ORDER_DATE_RANGE_INVALID',
          'Rentang tanggal pesanan tidak valid.',
        );
      }
      where.createdAt = createdAt;
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: items.map((x) => this.map(x, true)),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async findOne(id: string) {
    await this.maintenance();
    return this.map(await this.find(id), true);
  }

  async update(
    actor: AuthPrincipal,
    id: string,
    dto: UpdateOrderDto,
    key: string | undefined,
    requestId: string,
  ) {
    this.assertKey(key);
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new ApiError(
        400,
        'ORDER_UPDATE_EMPTY',
        'Tidak ada perubahan pesanan yang dikirim.',
      );
    }
    const hash = this.hash(dto);
    const result = await this.executeIdempotent(key!, 'UPDATE', hash, () =>
      this.runSerializable(async (tx) => {
        const replay = await tx.orderMutation.findUnique({ where: { key } });
        if (replay) return this.replay(tx, replay, 'UPDATE', hash);
        await tx.$queryRaw`SELECT id FROM orders WHERE id=${id}::uuid FOR UPDATE`;
        const current = await tx.order.findUnique({
          where: { id },
          include: orderInclude,
        });
        if (!current) throw this.notFound();
        this.assertEditable(current);
        let total = current.totalAmount;
        if (dto.items) {
          const built = await this.buildItems(tx, dto.items);
          total = built.total;
          await tx.orderItem.deleteMany({ where: { orderId: id } });
          await tx.orderItem.createMany({
            data: built.items.map((x) => ({ ...x, orderId: id })),
          });
        }
        const changedFields = Object.keys(dto).filter((k) => k !== 'items');
        if (dto.items) changedFields.push('items');
        await tx.order.update({
          where: { id },
          data: {
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
            customerEmail: dto.customerEmail,
            customerAddress: dto.customerAddress,
            totalAmount: total,
            version: { increment: 1 },
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'ORDER_UPDATED',
            targetType: 'ORDER',
            targetId: id,
            requestId,
            safeMetadata: { changedFields },
          },
        });
        await tx.orderMutation.create({
          data: {
            key: key!,
            kind: 'UPDATE',
            requestHash: hash,
            orderId: id,
            actorUserId: actor.userId,
          },
        });
        return tx.order.findUniqueOrThrow({
          where: { id },
          include: orderInclude,
        });
      }),
    );
    return this.map(result, true);
  }

  async transition(
    actor: AuthPrincipal,
    id: string,
    action: OrderAction,
    key: string | undefined,
    requestId: string,
  ) {
    this.assertKey(key);
    const hash = this.hash({ id, action });
    let result: OrderRecord;
    try {
      result = await this.executeIdempotent(key!, action, hash, () =>
        this.runSerializable(async (tx) => {
          const replay = await tx.orderMutation.findUnique({ where: { key } });
          if (replay) return this.replay(tx, replay, action, hash);
          await tx.$queryRaw`SELECT id FROM orders WHERE id=${id}::uuid FOR UPDATE`;
          let order = await tx.order.findUnique({
            where: { id },
            include: orderInclude,
          });
          if (!order) throw this.notFound();
          const previousStatus = order.status;
          const now = new Date();
          let next: OrderStatus;
          if (action === 'SUBMIT' && order.status === 'DRAFT') {
            if (order.expiresAt && order.expiresAt <= now)
              throw new ApiError(
                409,
                'ORDER_DRAFT_EXPIRED',
                'Draft pesanan sudah kedaluwarsa.',
              );
            next = 'PENDING_CONFIRMATION';
          } else if (
            action === 'CONFIRM' &&
            order.status === 'PENDING_CONFIRMATION'
          ) {
            next = 'CONFIRMED';
            await this.confirm(tx, order, actor, now);
          } else if (action === 'COMPLETE' && order.status === 'CONFIRMED')
            next = 'COMPLETED';
          else if (
            action === 'CANCEL' &&
            ['DRAFT', 'PENDING_CONFIRMATION'].includes(order.status)
          )
            next = 'CANCELLED';
          else
            throw new ApiError(
              409,
              'ORDER_TRANSITION_NOT_ALLOWED',
              'Perubahan status pesanan tidak diizinkan.',
            );
          const data: Prisma.OrderUpdateInput = {
            status: next,
            version: { increment: 1 },
          };
          if (next === 'CONFIRMED') {
            data.confirmedAt = now;
            data.confirmedBy = { connect: { id: actor.userId } };
          }
          if (next === 'COMPLETED') data.completedAt = now;
          if (next === 'CANCELLED') data.cancelledAt = now;
          order = await tx.order.update({
            where: { id },
            data,
            include: orderInclude,
          });
          await tx.auditLog.create({
            data: {
              actorUserId: actor.userId,
              action: `ORDER_${action}`,
              targetType: 'ORDER',
              targetId: id,
              requestId,
              safeMetadata: { from: previousStatus, to: next },
            },
          });
          await tx.orderMutation.create({
            data: {
              key: key!,
              kind: action,
              requestHash: hash,
              orderId: id,
              actorUserId: actor.userId,
            },
          });
          return order;
        }),
      );
    } catch (error) {
      if (this.apiErrorCode(error) === 'ORDER_STOCK_INSUFFICIENT') {
        await this.prisma.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'ORDER_CONFIRM_REJECTED',
            targetType: 'ORDER',
            targetId: id,
            requestId,
            safeMetadata: { reason: 'STOCK_INSUFFICIENT' },
          },
        });
      }
      throw error;
    }
    return this.map(result, true);
  }

  private async create(
    actor: AuthPrincipal | null,
    source: 'PUBLIC_WHATSAPP' | 'INTERNAL',
    dto: CreateOrderDto,
    key: string | undefined,
    requestId: string,
  ) {
    this.assertKey(key);
    const hash = this.hash({ source, ...dto });
    return this.executeIdempotent(key!, 'CREATE', hash, () =>
      this.runSerializable(async (tx) => {
        const replay = await tx.orderMutation.findUnique({ where: { key } });
        if (replay) return this.replay(tx, replay, 'CREATE', hash);
        const built = await this.buildItems(tx, dto.items);
        const now = Date.now();
        let order: OrderRecord | undefined;
        for (let i = 0; i < 5 && !order; i++) {
          try {
            order = await tx.order.create({
              data: {
                publicCode: createPublicCode(),
                source,
                status: 'DRAFT',
                customerName: dto.customerName,
                customerPhone: dto.customerPhone ?? null,
                customerEmail: dto.customerEmail ?? null,
                customerAddress: dto.customerAddress ?? null,
                totalAmount: built.total,
                createdByUserId: actor?.userId,
                expiresAt:
                  source === 'PUBLIC_WHATSAPP'
                    ? new Date(now + DRAFT_TTL_MS)
                    : null,
                items: { create: built.items },
              },
              include: orderInclude,
            });
          } catch (e) {
            if (!this.hasCode(e, 'P2002')) throw e;
          }
        }
        if (!order)
          throw new ApiError(
            409,
            'ORDER_CONFLICT',
            'Kode pesanan gagal dibuat. Silakan ulangi.',
          );
        await tx.auditLog.create({
          data: {
            actorUserId: actor?.userId,
            action: 'ORDER_DRAFT_CREATED',
            targetType: 'ORDER',
            targetId: order.id,
            requestId,
            safeMetadata: { source, itemCount: order.items.length },
          },
        });
        await tx.orderMutation.create({
          data: {
            key: key!,
            kind: 'CREATE',
            requestHash: hash,
            orderId: order.id,
            actorUserId: actor?.userId,
          },
        });
        return order;
      }),
    );
  }

  private async buildItems(
    tx: Prisma.TransactionClient,
    input: OrderItemDto[],
  ) {
    const ids = input.map((x) => x.productId);
    if (new Set(ids).size !== ids.length)
      throw new ApiError(
        400,
        'ORDER_ITEM_DUPLICATED',
        'Produk yang sama tidak boleh ditambahkan dua kali.',
      );
    const products = await tx.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    if (products.length !== ids.length)
      throw new ApiError(
        409,
        'ORDER_ITEM_PRODUCT_INACTIVE',
        'Salah satu produk tidak tersedia.',
      );
    const byId = new Map(products.map((x) => [x.id, x]));
    let total = 0;
    const items = input.map((x) => {
      const p = byId.get(x.productId)!;
      const q = decimal(x.quantity);
      if (q.lte(0))
        throw new ApiError(
          400,
          'ORDER_ITEM_QUANTITY_INVALID',
          'Kuantitas harus lebih dari nol.',
        );
      const subtotal = q.mul(p.price).toDecimalPlaces(0).toNumber();
      if (!Number.isSafeInteger(subtotal) || subtotal > 2147483647)
        throw new ApiError(
          400,
          'ORDER_TOTAL_INVALID',
          'Total pesanan melebihi batas.',
        );
      total += subtotal;
      return {
        productId: p.id,
        snapshotSku: p.sku,
        snapshotName: p.name,
        snapshotUnit: p.stockUnit,
        unitPrice: p.price,
        quantity: q,
        subtotalAmount: subtotal,
      };
    });
    if (!Number.isSafeInteger(total) || total > 2147483647)
      throw new ApiError(
        400,
        'ORDER_TOTAL_INVALID',
        'Total pesanan melebihi batas.',
      );
    return { items, total };
  }

  private async confirm(
    tx: Prisma.TransactionClient,
    order: OrderRecord,
    actor: AuthPrincipal,
    now: Date,
  ) {
    const ids = order.items.map((x) => x.productId).sort();
    await tx.$queryRaw`SELECT product_id FROM inventory_balances WHERE product_id = ANY(${ids}::uuid[]) ORDER BY product_id FOR UPDATE`;
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      include: { inventoryBalance: true },
    });
    const byId = new Map(products.map((x) => [x.id, x]));
    for (const item of order.items) {
      const p = byId.get(item.productId);
      if (!p?.isActive || !p.inventoryBalance)
        throw new ApiError(
          409,
          'ORDER_ITEM_PRODUCT_INACTIVE',
          'Salah satu produk tidak dapat diproses.',
        );
      if (p.inventoryBalance.currentStock.lt(item.quantity))
        throw new ApiError(
          409,
          'ORDER_STOCK_INSUFFICIENT',
          'Stok salah satu produk tidak mencukupi.',
        );
    }
    for (const item of order.items) {
      const p = byId.get(item.productId)!;
      const before = p.inventoryBalance!.currentStock;
      const after = before.sub(item.quantity);
      await tx.inventoryBalance.update({
        where: { productId: item.productId },
        data: { currentStock: after, version: { increment: 1 } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'SALE_OUT',
          action: 'CONFIRM_ORDER',
          quantity: item.quantity,
          stockBefore: before,
          stockAfter: after,
          reasonCode: 'SALE',
          referenceType: 'ORDER',
          referenceId: order.id,
          idempotencyKey: randomUUID(),
          payloadHash: this.hash({ orderId: order.id, itemId: item.id }),
          actorUserId: actor.userId,
          occurredAt: now,
          orderItemId: item.id,
        },
      });
    }
  }

  private async maintenance() {
    const now = new Date();
    const expired = await this.prisma.order.findMany({
      where: { status: 'DRAFT', expiresAt: { lte: now } },
      select: { id: true },
      take: 100,
    });
    for (const x of expired)
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: { id: x.id, status: 'DRAFT' },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            version: { increment: 1 },
          },
        });
        if (result.count > 0)
          await tx.auditLog.create({
            data: {
              action: 'ORDER_EXPIRED',
              targetType: 'ORDER',
              targetId: x.id,
            },
          });
      });
    const cutoff = new Date(now.getTime() - PII_RETENTION_MS);
    await this.prisma.order.updateMany({
      where: {
        anonymizedAt: null,
        OR: [
          { completedAt: { lte: cutoff } },
          { cancelledAt: { lte: cutoff } },
        ],
      },
      data: {
        customerName: null,
        customerPhone: null,
        customerEmail: null,
        customerAddress: null,
        anonymizedAt: now,
      },
    });
  }
  private async find(id: string) {
    const x = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!x) throw this.notFound();
    return x;
  }
  private async replay(
    tx: Prisma.TransactionClient,
    m: { kind: string; requestHash: string; orderId: string },
    kind: string,
    hash: string,
  ) {
    if (m.kind !== kind || m.requestHash !== hash)
      throw new ApiError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency-Key sudah digunakan untuk permintaan berbeda.',
      );
    return tx.order.findUniqueOrThrow({
      where: { id: m.orderId },
      include: orderInclude,
    });
  }
  private async executeIdempotent(
    key: string,
    kind: string,
    hash: string,
    work: () => Promise<OrderRecord>,
  ) {
    try {
      return await work();
    } catch (error) {
      if (!this.hasCode(error, 'P2002')) throw error;
      const mutation = await this.prisma.orderMutation.findUnique({
        where: { key },
      });
      if (!mutation) throw error;
      if (mutation.kind !== kind || mutation.requestHash !== hash) {
        throw new ApiError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency-Key sudah digunakan untuk permintaan berbeda.',
        );
      }
      return this.find(mutation.orderId);
    }
  }
  private assertEditable(o: OrderRecord) {
    if (!['DRAFT', 'PENDING_CONFIRMATION'].includes(o.status))
      throw new ApiError(
        409,
        'ORDER_TRANSITION_NOT_ALLOWED',
        'Pesanan tidak dapat diubah pada status ini.',
      );
  }
  private assertKey(k: string | undefined) {
    if (!k)
      throw new ApiError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Header Idempotency-Key wajib diisi.',
      );
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        k,
      )
    )
      throw new ApiError(
        400,
        'IDEMPOTENCY_KEY_INVALID',
        'Idempotency-Key harus berupa UUID v4.',
      );
  }
  private hash(v: unknown) {
    return createHash('sha256').update(stableJson(v)).digest('hex');
  }
  private notFound() {
    return new ApiError(404, 'ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.');
  }
  private hasCode(e: unknown, c: string) {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: unknown }).code === c
    );
  }
  private apiErrorCode(error: unknown) {
    if (!(error instanceof ApiError)) return undefined;
    const response = error.getResponse();
    return typeof response === 'object' && response
      ? (response as { code?: unknown }).code
      : undefined;
  }
  private async runSerializable<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let i = 0; i < 3; i++) {
      try {
        return await this.prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (e) {
        if (i < 2 && this.isRetryableTransactionError(e)) continue;
        throw e;
      }
    }
    throw new Error('Retry transaksi gagal.');
  }
  private isRetryableTransactionError(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as {
      code?: unknown;
      meta?: { code?: unknown };
    };
    const code = String(candidate.code ?? '');
    const databaseCode = String(candidate.meta?.code ?? '');
    const message = error instanceof Error ? error.message : '';
    return (
      code === 'P2034' ||
      ['40001', '40P01'].includes(code) ||
      (code === 'P2010' &&
        (['40001', '40P01'].includes(databaseCode) ||
          message.includes('40001') ||
          message.includes('40P01')))
    );
  }
  private map(o: OrderRecord, internal: boolean) {
    return {
      id: internal ? o.id : undefined,
      publicCode: o.publicCode,
      source: o.source,
      status: o.status,
      customer: internal
        ? {
            name: o.customerName,
            phone: o.customerPhone,
            email: o.customerEmail,
            address: o.customerAddress,
            anonymized: o.anonymizedAt !== null,
          }
        : undefined,
      items: o.items.map((i) => ({
        id: internal ? i.id : undefined,
        productId: i.productId,
        sku: i.snapshotSku,
        name: i.snapshotName,
        stockUnit: i.snapshotUnit,
        unitPrice: i.unitPrice,
        quantity: decimalString(i.quantity),
        subtotalAmount: i.subtotalAmount,
        movementId: internal ? i.stockMovement?.id : undefined,
      })),
      totalAmount: o.totalAmount,
      currency: o.currency,
      expiresAt: o.expiresAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
