import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { DashboardQueryDto } from './dashboard-query.dto.js';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  private period(query: DashboardQueryDto) {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 86400000);
    const to = query.to ? new Date(query.to) : new Date();
    if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException(
        'Periode tidak valid atau melebihi 366 hari.',
      );
    return { gte: from, lt: to };
  }

  async sales(query: DashboardQueryDto) {
    const period = this.period(query);
    const [counts, total, best] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: period },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<
        Array<{ total: string }>
      >`SELECT COALESCE(SUM(total_amount), 0)::text AS total FROM orders WHERE status IN ('CONFIRMED', 'COMPLETED') AND stock_deducted_at >= ${period.gte} AND stock_deducted_at < ${period.lt}`,
      this.prisma.$queryRaw<
        Array<{
          productId: string;
          name: string;
          unit: string;
          quantity: string;
        }>
      >`SELECT i.product_id AS "productId", (array_agg(i.snapshot_name ORDER BY o.stock_deducted_at DESC, i.id DESC))[1] AS name, i.snapshot_unit AS unit, SUM(i.quantity)::text AS quantity FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status IN ('CONFIRMED', 'COMPLETED') AND o.stock_deducted_at >= ${period.gte} AND o.stock_deducted_at < ${period.lt} GROUP BY i.product_id, i.snapshot_unit ORDER BY SUM(i.quantity) DESC, i.product_id LIMIT 10`,
    ]);
    return {
      period: { from: period.gte, to: period.lt },
      orderCounts: counts.map((x) => ({
        status: x.status,
        count: x._count._all,
      })),
      totalSales: total[0]?.total ?? '0',
      bestSelling: best,
    };
  }

  async inventory(query: DashboardQueryDto) {
    const period = this.period(query);
    const [totalProducts, byUnit, low, out, movements] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.$queryRaw<
        Array<{
          unit: string;
          quantity: string;
          reservedQuantity: string;
          availableQuantity: string;
        }>
      >`SELECT p.stock_unit AS unit, COALESCE(SUM(b.current_stock), 0)::text AS quantity, COALESCE(SUM(b.reserved_stock), 0)::text AS "reservedQuantity", COALESCE(SUM(b.current_stock - b.reserved_stock), 0)::text AS "availableQuantity" FROM products p LEFT JOIN inventory_balances b ON b.product_id = p.id WHERE p.is_active = true GROUP BY p.stock_unit ORDER BY p.stock_unit`,
      this.prisma.$queryRaw<
        Array<{ id: string; name: string; quantity: string; unit: string }>
      >`SELECT p.id, p.name, COALESCE(b.current_stock, 0)::text AS quantity, p.stock_unit AS unit FROM products p LEFT JOIN inventory_balances b ON b.product_id = p.id WHERE p.is_active = true AND COALESCE(b.current_stock, 0) < p.minimum_stock ORDER BY p.name, p.id LIMIT 100`,
      this.prisma.$queryRaw<
        Array<{ id: string; name: string; unit: string }>
      >`SELECT p.id, p.name, p.stock_unit AS unit FROM products p LEFT JOIN inventory_balances b ON b.product_id = p.id WHERE p.is_active = true AND COALESCE(b.current_stock, 0) = 0 ORDER BY p.name, p.id LIMIT 100`,
      this.prisma.$queryRaw<
        Array<{ unit: string; direction: string; quantity: string }>
      >`SELECT p.stock_unit AS unit, CASE WHEN m.stock_after > m.stock_before THEN 'IN' ELSE 'OUT' END AS direction, SUM(ABS(m.stock_after - m.stock_before))::text AS quantity FROM stock_movements m JOIN products p ON p.id = m.product_id WHERE m.occurred_at >= ${period.gte} AND m.occurred_at < ${period.lt} GROUP BY p.stock_unit, direction ORDER BY p.stock_unit, direction`,
    ]);
    return {
      period: { from: period.gte, to: period.lt },
      totalProducts,
      stockByUnit: byUnit,
      lowStock: low,
      outOfStock: out,
      movements,
      listLimit: 100,
    };
  }
}
