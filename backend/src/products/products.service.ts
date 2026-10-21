import { HttpStatus, Injectable } from '@nestjs/common';
import {
  createSlug,
  normalizeKey,
  pagination,
} from '../catalog/catalog.utils.js';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type {
  ListProductsQueryDto,
  ProductSortField,
} from './dto/list-products-query.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import {
  productWithCategory,
  toProductResponse,
} from './product-response.mapper.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        {
          skuNormalized: {
            contains: query.search.toLowerCase(),
            mode: 'insensitive',
          },
        },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const sortField = this.sortField(query.sort);
    const orderBy = [
      { [sortField]: query.order },
      { id: 'asc' as const },
    ] as Prisma.ProductOrderByWithRelationInput[];
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productWithCategory,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: records.map(toProductResponse),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async findOne(productId: string) {
    return toProductResponse(await this.findOrThrow(productId));
  }

  async create(actor: AuthPrincipal, dto: CreateProductDto, requestId: string) {
    try {
      const product = await this.runSerializable(async (tx) => {
        await this.assertActiveCategory(tx, dto.categoryId);
        const created = await tx.product.create({
          data: {
            sku: dto.sku,
            skuNormalized: normalizeKey(dto.sku),
            name: dto.name,
            slug: createSlug(dto.name),
            description: dto.description ?? null,
            categoryId: dto.categoryId,
            price: dto.price,
            imageRef: dto.imageRef ?? null,
            minimumStock: dto.minimumStock,
            leadTimeDays: dto.leadTimeDays,
            safetyStock: dto.safetyStock,
            reorderPoint: dto.reorderPoint,
          },
          include: productWithCategory,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'PRODUCT_CREATED',
            targetType: 'PRODUCT',
            targetId: created.id,
            requestId,
          },
        });
        return created;
      });
      return toProductResponse(product);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.uniqueConflict(error);
      throw error;
    }
  }

  async update(
    actor: AuthPrincipal,
    productId: string,
    dto: UpdateProductDto,
    requestId: string,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Isi minimal satu perubahan produk.',
      );
    }
    try {
      const product = await this.runSerializable(async (tx) => {
        await this.lockProduct(tx, productId);
        const current = await tx.product.findUnique({
          where: { id: productId },
          include: productWithCategory,
        });
        if (!current) throw this.notFound();
        if (
          dto.categoryId !== undefined &&
          dto.categoryId !== current.categoryId
        ) {
          await this.assertActiveCategory(tx, dto.categoryId);
        }

        const data: Prisma.ProductUpdateInput = {};
        const changedFields: string[] = [];
        this.assign(data, changedFields, 'sku', dto.sku, current.sku);
        if (dto.sku !== undefined && dto.sku !== current.sku) {
          data.skuNormalized = normalizeKey(dto.sku);
        }
        this.assign(data, changedFields, 'name', dto.name, current.name);
        this.assign(
          data,
          changedFields,
          'description',
          dto.description,
          current.description,
        );
        this.assign(data, changedFields, 'price', dto.price, current.price);
        this.assign(
          data,
          changedFields,
          'imageRef',
          dto.imageRef,
          current.imageRef,
        );
        this.assign(
          data,
          changedFields,
          'minimumStock',
          dto.minimumStock,
          current.minimumStock,
        );
        this.assign(
          data,
          changedFields,
          'leadTimeDays',
          dto.leadTimeDays,
          current.leadTimeDays,
        );
        this.assign(
          data,
          changedFields,
          'safetyStock',
          dto.safetyStock,
          current.safetyStock,
        );
        this.assign(
          data,
          changedFields,
          'reorderPoint',
          dto.reorderPoint,
          current.reorderPoint,
        );
        if (
          dto.categoryId !== undefined &&
          dto.categoryId !== current.categoryId
        ) {
          data.category = { connect: { id: dto.categoryId } };
          changedFields.push('categoryId');
        }
        if (changedFields.length === 0) return current;

        const updated = await tx.product.update({
          where: { id: productId },
          data,
          include: productWithCategory,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'PRODUCT_UPDATED',
            targetType: 'PRODUCT',
            targetId: productId,
            requestId,
            safeMetadata: { changedFields },
          },
        });
        return updated;
      });
      return toProductResponse(product);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.uniqueConflict(error);
      throw error;
    }
  }

  async deactivate(actor: AuthPrincipal, productId: string, requestId: string) {
    const product = await this.runSerializable(async (tx) => {
      await this.lockProduct(tx, productId);
      const current = await tx.product.findUnique({
        where: { id: productId },
        include: productWithCategory,
      });
      if (!current) throw this.notFound();
      if (!current.isActive) return current;
      const updated = await tx.product.update({
        where: { id: productId },
        data: { isActive: false },
        include: productWithCategory,
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'PRODUCT_DEACTIVATED',
          targetType: 'PRODUCT',
          targetId: productId,
          requestId,
          safeMetadata: { previousStatus: 'ACTIVE', newStatus: 'INACTIVE' },
        },
      });
      return updated;
    });
    return toProductResponse(product);
  }

  private assign<K extends keyof Prisma.ProductUpdateInput>(
    data: Prisma.ProductUpdateInput,
    changedFields: string[],
    key: K,
    value: Prisma.ProductUpdateInput[K] | undefined,
    current: unknown,
  ) {
    if (value !== undefined && value !== current) {
      data[key] = value;
      changedFields.push(String(key));
    }
  }

  private async assertActiveCategory(
    tx: Prisma.TransactionClient,
    categoryId: string,
  ) {
    const category = await tx.category.findUnique({
      where: { id: categoryId },
      select: { isActive: true },
    });
    if (!category) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'CATEGORY_NOT_FOUND',
        'Kategori tidak ditemukan.',
      );
    }
    if (!category.isActive) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'PRODUCT_CATEGORY_INACTIVE',
        'Kategori tidak aktif.',
      );
    }
  }

  private async findOrThrow(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: productWithCategory,
    });
    if (!product) throw this.notFound();
    return product;
  }

  private async lockProduct(tx: Prisma.TransactionClient, productId: string) {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
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
        if (attempt < 3 && this.hasPrismaCode(error, 'P2034')) continue;
        throw error;
      }
    }
    throw new Error('Retry transaksi tidak menghasilkan keputusan.');
  }

  private sortField(sort: ProductSortField) {
    return sort === 'sku' ? 'skuNormalized' : sort;
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }

  private notFound() {
    return new ApiError(
      HttpStatus.NOT_FOUND,
      'PRODUCT_NOT_FOUND',
      'Produk tidak ditemukan.',
    );
  }

  private uniqueConflict(error: unknown) {
    const target = this.prismaTarget(error);
    if (target.includes('slug')) {
      return new ApiError(
        HttpStatus.CONFLICT,
        'PRODUCT_SLUG_ALREADY_USED',
        'Slug produk sudah digunakan.',
      );
    }
    return new ApiError(
      HttpStatus.CONFLICT,
      'SKU_ALREADY_USED',
      'SKU sudah digunakan.',
    );
  }

  private prismaTarget(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('meta' in error))
      return '';
    return JSON.stringify((error as { meta?: unknown }).meta).toLowerCase();
  }
}
