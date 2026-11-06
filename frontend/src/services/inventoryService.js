import { INITIAL_MOVEMENTS } from '../mocks/ordersAndInventoryData';
import { STOCK_STATUS } from '../types';
import { delay, request, USE_REAL_BACKEND } from './apiClient';
import { productService } from './productService';
import { notificationService } from './notificationService';

const STORAGE_MOVEMENTS = 'farmsight_movements_db_v1';

function getLocalMovements() {
  const d = localStorage.getItem(STORAGE_MOVEMENTS);
  if (!d) {
    localStorage.setItem(STORAGE_MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
    return INITIAL_MOVEMENTS;
  }
  return JSON.parse(d);
}

function saveLocalMovements(movements) {
  localStorage.setItem(STORAGE_MOVEMENTS, JSON.stringify(movements));
  window.dispatchEvent(new Event('farmsight_movements_updated'));
}

export const inventoryService = {
  async getInventoryOverview() {
    if (USE_REAL_BACKEND) return request('/inventory/overview');
    await delay(180);

    const products = await productService.getProducts();
    const totalProducts = products.length;
    const totalPhysicalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    const lowStockItems = products.filter((p) => p.stock > 0 && p.stock <= (p.reorderPoint || p.minStock || 15));
    const outOfStockItems = products.filter((p) => (p.stock || 0) === 0);

    const criticalItems = products.filter(
      (p) => p.stock > 0 && p.stock <= (p.safetyStock || Math.round((p.reorderPoint || 15) * 0.5))
    );

    return {
      totalProducts,
      totalPhysicalStock,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      criticalCount: criticalItems.length,
      lowStockItems,
      outOfStockItems,
      criticalItems,
    };
  },

  async getMovements(filters = {}) {
    if (USE_REAL_BACKEND) {
      const q = new URLSearchParams(filters).toString();
      return request(`/inventory/movements?${q}`);
    }

    await delay(150);
    let list = getLocalMovements();

    if (filters.productId && filters.productId !== 'ALL') {
      list = list.filter((m) => m.productId === filters.productId);
    }
    if (filters.type && filters.type !== 'ALL') {
      list = list.filter((m) => m.type === filters.type);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(s) ||
          (m.reference && m.reference.toLowerCase().includes(s)) ||
          (m.operator && m.operator.toLowerCase().includes(s))
      );
    }

    return list;
  },

  async recordMovement({ productId, type, category, quantity, reference, note, operator }) {
    if (USE_REAL_BACKEND) {
      return request('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({ productId, type, category, quantity, reference, note, operator }),
      });
    }

    const product = await productService.getProductById(productId);
    const numQty = Number(quantity);
    let newStock = product.stock;

    if (type === 'IN') {
      newStock += Math.abs(numQty);
    } else if (type === 'OUT' && category !== 'Reservasi Pesanan') {
      newStock = Math.max(0, newStock - Math.abs(numQty));
    }

    // Update physical product stock if not pure reservation
    if (category !== 'Reservasi Pesanan') {
      await productService.updateProduct(productId, { stock: newStock });
    }

    const movements = getLocalMovements();
    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      productId: product.id,
      productName: product.name,
      type: type || 'IN',
      category: category || 'Penyesuaian Manual',
      reference: reference || 'Manual',
      quantity: type === 'IN' ? Math.abs(numQty) : -Math.abs(numQty),
      remainingStock: newStock,
      operator: operator || 'Staf FarmSight',
      note: note || '',
    };

    saveLocalMovements([newMovement, ...movements]);

    // Check ROP Gateway
    const rop = product.reorderPoint || product.minStock || 15;
    const isBelowRop = newStock <= rop;
    const isSafe = newStock > rop;

    if (isBelowRop) {
      notificationService.sendNotification({
        roleTarget: 'STOCK_MANAGER',
        title: 'Peringatan ROP: ' + product.name,
        message: `Sisa stok ${product.name} kini ${newStock} unit (Batas ROP: ${rop}). Perlu jadwal restock.`,
        type: 'WARNING',
        link: '/inventory/restock',
      });
    }

    return {
      movement: newMovement,
      newStock,
      isBelowRop,
      isSafe,
      status: isBelowRop ? STOCK_STATUS.PERLU_RESTOCK : STOCK_STATUS.AMAN,
    };
  },

  async getRestockRecommendations() {
    if (USE_REAL_BACKEND) return request('/inventory/restock-recommendations');
    await delay(180);

    const products = await productService.getProducts();
    const recommendations = [];

    for (const p of products) {
      const rop = p.reorderPoint || p.minStock || 15;
      const ss = p.safetyStock || Math.round(rop * 0.5);
      const stock = p.stock || 0;

      if (stock <= rop) {
        let priority = 'NORMAL';
        if (stock === 0) priority = 'HABIS';
        else if (stock <= ss) priority = 'KRITIS';
        else priority = 'TINGGI';

        // Formula suggested restock = (Target Buffer / ROP * 2) - currentStock
        const suggestedQty = Math.max(10, Math.round(rop * 2 - stock));

        recommendations.push({
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          category: p.category,
          currentStock: stock,
          unit: p.unit,
          safetyStock: ss,
          reorderPoint: rop,
          priority,
          suggestedQty,
          leadTimeDays: p.leadTimeDays || 3,
          estimatedCost: suggestedQty * (p.price * 0.6), // Estimasi modal ~60% harga jual
        });
      }
    }

    return recommendations.sort((a, b) => {
      const pMap = { HABIS: 4, KRITIS: 3, TINGGI: 2, NORMAL: 1 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    });
  },
};

