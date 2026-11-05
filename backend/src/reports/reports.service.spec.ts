import { describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { ROLE_CODES } from '../common/auth/auth.constants.js';

describe('ReportsService', () => {
  it('menolak akses sales ke laporan inventory', async () => {
    const service = new ReportsService({} as PrismaService);
    await expect(
      service.generate('inventory', {}, ROLE_CODES.SALES_ADMIN),
    ).rejects.toThrow();
  });

  it('menyediakan header CSV sekalipun data kosong', async () => {
    const prisma = { order: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new ReportsService(prisma as unknown as PrismaService);
    const file = await service.export(
      'sales',
      'csv',
      {},
      ROLE_CODES.SALES_ADMIN,
    );
    expect(file.buffer.toString('utf8')).toContain(
      '"kode","dikonfirmasi","stokKeluar","status","totalRupiah"',
    );
  });

  it('menolak format yang tidak diizinkan', async () => {
    const service = new ReportsService({} as PrismaService);
    await expect(
      service.export('sales', 'xlsx', {}, ROLE_CODES.SALES_ADMIN),
    ).rejects.toThrow();
  });
});
