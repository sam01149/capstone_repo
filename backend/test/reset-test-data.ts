import type { PrismaService } from '../src/database/prisma.service.js';

export async function resetTestData(prisma: PrismaService) {
  if (new URL(process.env.DATABASE_URL ?? '').pathname !== '/farmsight_test') {
    throw new Error('Pembersihan fixture hanya diizinkan pada farmsight_test.');
  }
  await prisma.$transaction([
    prisma.forecastRun.deleteMany(),
    prisma.demandWeek.deleteMany(),
    prisma.forecastDataset.deleteMany(),
    prisma.orderMutation.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.inventoryBalance.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notificationRead.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
  ]);
}
