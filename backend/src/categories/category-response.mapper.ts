import type { Category } from '../generated/prisma/client.js';

export function toCategoryResponse(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
