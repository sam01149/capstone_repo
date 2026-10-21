import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  createSlug,
  normalizeKey,
  pagination,
} from '../catalog/catalog.utils.js';
import { toCategoryResponse } from './category-response.mapper.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type {
  CategorySortField,
  ListCategoriesQueryDto,
} from './dto/list-categories-query.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCategoriesQueryDto) {
    const where: Prisma.CategoryWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const sortField = this.sortField(query.sort);
    const orderBy = [
      { [sortField]: query.order },
      { id: 'asc' as const },
    ] as Prisma.CategoryOrderByWithRelationInput[];
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return {
      items: records.map(toCategoryResponse),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async findOne(categoryId: string) {
    return toCategoryResponse(await this.findOrThrow(categoryId));
  }

  async create(
    actor: AuthPrincipal,
    dto: CreateCategoryDto,
    requestId: string,
  ) {
    try {
      const category = await this.runSerializable(async (tx) => {
        const created = await tx.category.create({
          data: {
            name: dto.name,
            nameNormalized: normalizeKey(dto.name),
            slug: createSlug(dto.name),
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'CATEGORY_CREATED',
            targetType: 'CATEGORY',
            targetId: created.id,
            requestId,
          },
        });
        return created;
      });
      return toCategoryResponse(category);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.uniqueConflict(error);
      throw error;
    }
  }

  async update(
    actor: AuthPrincipal,
    categoryId: string,
    dto: UpdateCategoryDto,
    requestId: string,
  ) {
    if (dto.name === undefined) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Isi minimal satu perubahan kategori.',
      );
    }
    const name = dto.name;
    try {
      const category = await this.runSerializable(async (tx) => {
        await this.lockCategory(tx, categoryId);
        const current = await tx.category.findUnique({
          where: { id: categoryId },
        });
        if (!current) throw this.notFound();
        if (name === current.name) return current;
        const updated = await tx.category.update({
          where: { id: categoryId },
          data: { name, nameNormalized: normalizeKey(name) },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'CATEGORY_UPDATED',
            targetType: 'CATEGORY',
            targetId: categoryId,
            requestId,
            safeMetadata: { changedFields: ['name'] },
          },
        });
        return updated;
      });
      return toCategoryResponse(category);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.uniqueConflict(error);
      throw error;
    }
  }

  async deactivate(
    actor: AuthPrincipal,
    categoryId: string,
    requestId: string,
  ) {
    const category = await this.runSerializable(async (tx) => {
      await this.lockCategory(tx, categoryId);
      const current = await tx.category.findUnique({
        where: { id: categoryId },
      });
      if (!current) throw this.notFound();
      if (!current.isActive) return current;
      const activeProducts = await tx.product.count({
        where: { categoryId, isActive: true },
      });
      if (activeProducts > 0) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'CATEGORY_HAS_ACTIVE_PRODUCTS',
          'Kategori masih digunakan oleh produk aktif.',
        );
      }
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'CATEGORY_DEACTIVATED',
          targetType: 'CATEGORY',
          targetId: categoryId,
          requestId,
          safeMetadata: { previousStatus: 'ACTIVE', newStatus: 'INACTIVE' },
        },
      });
      return updated;
    });
    return toCategoryResponse(category);
  }

  private async findOrThrow(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw this.notFound();
    return category;
  }

  private async lockCategory(tx: Prisma.TransactionClient, categoryId: string) {
    await tx.$queryRaw`SELECT id FROM categories WHERE id = ${categoryId}::uuid FOR UPDATE`;
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

  private sortField(sort: CategorySortField) {
    return sort === 'name' ? 'nameNormalized' : sort;
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
      'CATEGORY_NOT_FOUND',
      'Kategori tidak ditemukan.',
    );
  }

  private uniqueConflict(error: unknown) {
    const target = this.prismaTarget(error);
    if (target.includes('slug')) {
      return new ApiError(
        HttpStatus.CONFLICT,
        'CATEGORY_SLUG_ALREADY_USED',
        'Slug kategori sudah digunakan.',
      );
    }
    return new ApiError(
      HttpStatus.CONFLICT,
      'CATEGORY_NAME_ALREADY_USED',
      'Nama kategori sudah digunakan.',
    );
  }

  private prismaTarget(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('meta' in error))
      return '';
    return JSON.stringify((error as { meta?: unknown }).meta).toLowerCase();
  }
}
