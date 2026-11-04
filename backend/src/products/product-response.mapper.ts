import { Prisma } from '../generated/prisma/client.js';
import { decimalString } from '../inventory/decimal.utils.js';
import {
  STOCK_UNIT_LABELS,
  type StockUnit,
} from '../inventory/inventory.constants.js';

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
    minimumStock: decimalString(product.minimumStock),
    leadTimeDays: product.leadTimeDays,
    safetyStock: decimalString(product.safetyStock),
    reorderPoint: decimalString(product.reorderPoint),
    stockUnit: product.stockUnit,
    stockUnitLabel: STOCK_UNIT_LABELS[product.stockUnit as StockUnit],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
