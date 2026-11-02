import { describe, expect, it, vi } from 'vitest';
import { DashboardsService } from './dashboards.service.js';
import type { PrismaService } from '../database/prisma.service.js';

describe('DashboardsService', () => {
  it('menghitung nilai dan produk terlaris hanya dari order dikonfirmasi atau selesai', async () => {
    const prisma = {
      order: {
        groupBy: vi
          .fn()
          .mockResolvedValue([{ status: 'DRAFT', _count: { _all: 2 } }]),
      },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ total: '12500' }])
        .mockResolvedValueOnce([]),
    };
    const result = await new DashboardsService(
      prisma as unknown as PrismaService,
    ).sales({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' });
    expect(result.totalSales).toBe('12500');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('menolak periode terbalik dan rentang terlalu panjang', async () => {
    const service = new DashboardsService({} as PrismaService);
    await expect(
      service.sales({ from: '2026-11-01', to: '2026-10-01' }),
    ).rejects.toThrow();
    await expect(
      service.inventory({ from: '2020-01-01', to: '2026-01-01' }),
    ).rejects.toThrow();
  });
});
