import { HttpStatus, Injectable } from '@nestjs/common';
import { pagination } from '../catalog/catalog.utils.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ListPublicProductsQueryDto } from './dto/list-public-products-query.dto.js';

const publicProductInclude = {
  category: { select: { id: true, name: true } },
  inventoryBalance: true,
} satisfies Prisma.ProductInclude;

type PublicProduct = Prisma.ProductGetPayload<{
  include: typeof publicProductInclude;
}>;

@Injectable()
export class PublicCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPublicProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: publicProductInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map((item) => this.map(item)),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async find(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: publicProductInclude,
    });
    if (!product) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'PUBLIC_PRODUCT_NOT_FOUND',
        'Produk tidak ditemukan.',
      );
    }
    return this.map(product);
  }

  private map(product: PublicProduct) {
    const stock = product.inventoryBalance?.currentStock;
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageRef: product.imageRef,
      stockUnit: product.stockUnit,
      availability:
        !stock || stock.isZero()
          ? 'OUT_OF_STOCK'
          : stock.lte(product.reorderPoint)
            ? 'LIMITED'
            : 'AVAILABLE',
    };
  }
}
