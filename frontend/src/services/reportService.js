import { productService } from './productService';
import { orderService } from './orderService';
import { inventoryService } from './inventoryService';
import { forecastService } from './forecastService';

export const reportService = {
  async getSalesReport() {
    const orders = await orderService.getOrders();
    const completed = orders.filter((o) => o.status === 'SELESAI' || o.status === 'DIKONFIRMASI');
    const totalOmset = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return {
      totalOrders: orders.length,
      completedOrders: completed.length,
      totalRevenue: totalOmset,
      orders,
    };
  },

  async getInventoryReport() {
    const products = await productService.getProducts();
    const totalAssetValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
    return {
      totalProducts: products.length,
      totalAssetValue,
      products,
    };
  },

  async getMovementReport() {
    const movements = await inventoryService.getMovements();
    return {
      totalMovements: movements.length,
      movements,
    };
  },

  exportCsv(filename, headers, rows) {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportPrint(title, tableHtml) {
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - UMKM Toko Farm Berkah</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #142019; }
            h1 { font-size: 18px; margin-bottom: 4px; color: #1b4332; }
            .sub { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>UMKM TOKO FARM BERKAH - LAPORAN RESMI</h1>
          <div class="sub">${title} · Digenerate pada: ${new Date().toLocaleString('id-ID')}</div>
          ${tableHtml}
          <div style="margin-top: 24px; font-size: 11px; color: #64748b;">
            FarmSight Intelligent Agricultural Inventory & Forecasting Management Platform
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    w.document.close();
  },
};

