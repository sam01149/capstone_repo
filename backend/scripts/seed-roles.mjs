import { prisma } from './database-client.mjs';

const roles = [
  { code: 'SUPER_ADMIN', name: 'Super Admin' },
  { code: 'STOCK_MANAGER', name: 'Stock Manager' },
  { code: 'SALES_ADMIN', name: 'Sales Admin' },
];

try {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: role,
      update: { name: role.name },
    });
  }
  console.log('Tiga role FarmSight siap digunakan.');
} finally {
  await prisma.$disconnect();
}
