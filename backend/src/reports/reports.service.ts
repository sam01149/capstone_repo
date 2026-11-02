import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ROLE_CODES, type RoleCode } from '../common/auth/auth.constants.js';
import { PrismaService } from '../database/prisma.service.js';
import type { DashboardQueryDto } from '../dashboards/dashboard-query.dto.js';

type Row = Record<string, string | number | null>;
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(type: string, query: DashboardQueryDto, role: RoleCode) {
    if (!['inventory', 'sales', 'movements', 'forecast'].includes(type))
      throw new BadRequestException('Jenis laporan tidak valid.');
    if (
      role !== ROLE_CODES.SUPER_ADMIN &&
      (type === 'sales') !== (role === ROLE_CODES.SALES_ADMIN)
    )
      throw new ForbiddenException('Akses laporan tidak diizinkan.');
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 86400000);
    const to = query.to ? new Date(query.to) : new Date();
    if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException(
        'Periode tidak valid atau melebihi 366 hari.',
      );
    let rows: Row[];
    if (type === 'inventory') {
      const data = await this.prisma.product.findMany({
        where: { isActive: true },
        select: {
          sku: true,
          name: true,
          stockUnit: true,
          minimumStock: true,
          safetyStock: true,
          reorderPoint: true,
          inventoryBalance: { select: { currentStock: true } },
        },
        take: 1001,
        orderBy: { id: 'asc' },
      });
      rows = data.map((p) => ({
        sku: p.sku,
        produk: p.name,
        satuan: p.stockUnit,
        stok: p.inventoryBalance?.currentStock.toFixed(3) ?? '0.000',
        minimum: p.minimumStock.toFixed(3),
        safetyStock: p.safetyStock.toFixed(3),
        reorderPoint: p.reorderPoint.toFixed(3),
      }));
    } else if (type === 'sales') {
      const data = await this.prisma.order.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          confirmedAt: { gte: from, lt: to },
        },
        select: {
          publicCode: true,
          confirmedAt: true,
          status: true,
          totalAmount: true,
        },
        take: 1001,
        orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
      });
      rows = data.map((o) => ({
        kode: o.publicCode,
        dikonfirmasi: o.confirmedAt?.toISOString() ?? null,
        status: o.status,
        totalRupiah: o.totalAmount,
      }));
    } else if (type === 'movements') {
      const data = await this.prisma.stockMovement.findMany({
        where: { occurredAt: { gte: from, lt: to } },
        select: {
          occurredAt: true,
          type: true,
          quantity: true,
          stockBefore: true,
          stockAfter: true,
          product: { select: { sku: true, name: true, stockUnit: true } },
        },
        take: 1001,
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      });
      rows = data.map((m) => ({
        tanggal: m.occurredAt.toISOString(),
        sku: m.product.sku,
        produk: m.product.name,
        satuan: m.product.stockUnit,
        tipe: m.type,
        jumlah: m.quantity.toFixed(3),
        sebelum: m.stockBefore.toFixed(3),
        sesudah: m.stockAfter.toFixed(3),
      }));
    } else {
      const data = await this.prisma.forecastRun.findMany({
        where: { status: 'SUCCESS', completedAt: { gte: from, lt: to } },
        select: {
          completedAt: true,
          modelVersion: true,
          result: true,
          product: { select: { sku: true, name: true } },
        },
        take: 1001,
        orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      });
      rows = data.map((f) => {
        const result =
          f.result && typeof f.result === 'object' && !Array.isArray(f.result)
            ? f.result
            : {};
        return {
          sku: f.product.sku,
          produk: f.product.name,
          tanggal: f.completedAt?.toISOString() ?? null,
          model: f.modelVersion,
          metode: typeof result.method === 'string' ? result.method : null,
          prediksi: JSON.stringify(result.forecast ?? []),
          safetyStock:
            typeof result.safetyStock === 'number' ? result.safetyStock : null,
          reorderPoint:
            typeof result.reorderPoint === 'number'
              ? result.reorderPoint
              : null,
        };
      });
    }
    if (rows.length > 1000)
      throw new BadRequestException(
        type === 'inventory'
          ? 'Jumlah produk melebihi batas laporan 1000 baris.'
          : 'Laporan terlalu besar; persempit periode.',
      );
    return {
      type,
      from: from.toISOString(),
      to: to.toISOString(),
      stockAsOf: type === 'inventory' ? new Date().toISOString() : null,
      rows,
    };
  }

  async export(
    type: string,
    format: string,
    query: DashboardQueryDto,
    role: RoleCode,
  ) {
    if (!['csv', 'pdf'].includes(format))
      throw new BadRequestException('Format ekspor tidak valid.');
    const report = await this.generate(type, query, role);
    const columnsByType: Record<string, string[]> = {
      inventory: [
        'sku',
        'produk',
        'satuan',
        'stok',
        'minimum',
        'safetyStock',
        'reorderPoint',
      ],
      sales: ['kode', 'dikonfirmasi', 'status', 'totalRupiah'],
      movements: [
        'tanggal',
        'sku',
        'produk',
        'satuan',
        'tipe',
        'jumlah',
        'sebelum',
        'sesudah',
      ],
      forecast: [
        'sku',
        'produk',
        'tanggal',
        'model',
        'metode',
        'prediksi',
        'safetyStock',
        'reorderPoint',
      ],
    };
    const columns = columnsByType[type];
    if (format === 'csv') {
      const cell = (value: unknown) => {
        const s = String(value ?? '');
        const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(s) ? `'${s}` : s;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const csv = [
        columns.map(cell).join(','),
        ...report.rows.map((row) => columns.map((k) => cell(row[k])).join(',')),
      ].join('\r\n');
      return {
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from('\uFEFF' + csv, 'utf8'),
      };
    }
    const doc = new PDFDocument({ margin: 36 });
    const chunks: Buffer[] = [];
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    doc.fontSize(15).text(`Laporan ${type}`);
    doc
      .fontSize(9)
      .text(`Periode: ${report.from} - ${report.to} (akhir eksklusif)`);
    if (report.stockAsOf) doc.text(`Stok saat dibuat: ${report.stockAsOf}`);
    if (!report.rows.length) doc.text('Tidak ada data.');
    for (const row of report.rows) {
      doc.moveDown(0.5);
      for (const col of columns) doc.text(`${col}: ${String(row[col] ?? '-')}`);
    }
    doc.end();
    return { contentType: 'application/pdf', buffer: await complete };
  }
}
