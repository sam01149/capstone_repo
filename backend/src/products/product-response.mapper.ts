import { Prisma } from '../generated/prisma/client.js';

export const productWithCategory = {
  category: { select: { id: true, name: true, slug: true, isActive: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof productWithCategory;
}>;

export function toProductResponse(product: ProductWithCategory) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    price: product.price,
    imageRef: product.imageRef,
    isActive: product.isActive,
    minimumStock: product.minimumStock,
    leadTimeDays: product.leadTimeDays,
    safetyStock: product.safetyStock,
    reorderPoint: product.reorderPoint,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
