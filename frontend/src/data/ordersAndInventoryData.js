// FarmSight Orders, Inventory & Business Process Data Engine
// Handles: Customer Draft Invoices, Sales Orders, Gateway Verifications,
// QRIS Payment, Stock Deduction, Stock Movement, ROP Alerts, Demand Forecasting, and Reports.

import { getStoredProducts, saveStoredProducts, formatRupiah } from './productsData';

const STORAGE_KEY_ORDERS = 'farmsight_orders_db_v1';
const STORAGE_KEY_MOVEMENTS = 'farmsight_stock_movements_v1';
const STORAGE_KEY_DRAFT_INVOICES = 'farmsight_draft_invoices_v1';
const STORAGE_KEY_FORECASTS = 'farmsight_forecasts_data_v1';

// Initial Mock Orders
export const INITIAL_ORDERS = [
  {
    id: 'ORD-2026-081',
    draftInvoiceNo: 'DRAFT-INV-20261104-001',
    customerName: 'Ibu Ratna (Reseller)',
    customerPhone: '+62 812-3456-7890',
    customerAddress: 'Jl. Pemuda No. 45, Rawamangun, Jakarta Timur',
    productId: 'KERIPIK-LABU',
    productName: 'KERIPIK LABU',
    unit: '100 GR',
    price: 10000,
    quantity: 10,
    totalAmount: 100000,
    status: 'MENUNGGU_PEMBAYARAN', // DRAFT, MENUNGGU_PEMBAYARAN, BUKTI_DIKIRIM, PERLU_TRANSFER_ULANG, SELESAI, DIBATALKAN
    stockReserved: true,
    transferProofImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    transferAmount: 100000,
    createdAt: '2026-11-04 14:20',
  },
  {
    id: 'ORD-2026-080',
    draftInvoiceNo: 'DRAFT-INV-20261104-002',
    customerName: 'Bpk. Hendra Wijaya',
    customerPhone: '+62 856-7890-1234',
    customerAddress: 'Komplek Pulo Gebang Permai Blok B2 No. 8',
    productId: 'ES-TELANG',
    productName: 'ES TELANG',
    unit: '10 GR',
    price: 5000,
    quantity: 5,
    totalAmount: 25000,
    status: 'BUKTI_DIKIRIM',
    stockReserved: true,
    transferProofImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    transferAmount: 25000,
    createdAt: '2026-11-04 15:45',
  },
  {
    id: 'ORD-2026-079',
    draftInvoiceNo: 'DRAFT-INV-20261104-003',
    customerName: 'Ibu Siti Rahayu',
    customerPhone: '+62 878-1122-3344',
    customerAddress: 'Jl. Raya Bekasi KM 24, Cakung',
    productId: 'GORENGAN',
    productName: 'GORENGAN',
    unit: '1 PCS',
    price: 2000,
    quantity: 20,
    totalAmount: 40000,
    status: 'SELESAI',
    stockReserved: false,
    transferProofImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    transferAmount: 40000,
    createdAt: '2026-11-04 11:30',
  },
];

// Initial Mock Stock Movements
export const INITIAL_MOVEMENTS = [
  {
    id: 'MOV-091',
    date: '2026-11-04 11:32',
    productId: 'GORENGAN',
    productName: 'GORENGAN',
    type: 'OUT',
    category: 'Penjualan Pesanan',
    reference: 'ORD-2026-079',
    quantity: -20,
    remainingStock: 60,
    operator: 'Staff Gudang (BS)',
  },
  {
    id: 'MOV-090',
    date: '2026-11-04 09:15',
    productId: 'KERIPIK-LABU',
    productName: 'KERIPIK LABU',
    type: 'IN',
    category: 'Panen & Produksi Baru',
    reference: 'BATCH-PROD-20261104',
    quantity: +30,
    remainingStock: 45,
    operator: 'Staff Persediaan (BS)',
  },
  {
    id: 'MOV-089',
    date: '2026-11-03 16:40',
    productId: 'BAYAM',
    productName: 'BAYAM',
    type: 'OUT',
    category: 'Penjualan Toko Offline',
    reference: 'KASIR-004',
    quantity: -12,
    remainingStock: 18,
    operator: 'Sales Admin (SR)',
  },
];

// Initial Demand Forecasts (ARIMA & Croston SBA)
export const INITIAL_FORECASTS = [
  {
    productId: 'ES-TELANG',
    productName: 'ES TELANG',
    category: 'Minuman Segar & Teh',
    demandType: 'Kontinu (Reguler)',
    recommendedMethod: 'ARIMA (1,1,1)',
    horizonW1: 24,
    horizonW2: 26,
    horizonW3: 28,
    horizonW4: 30,
    rmse: '1.42 (Optimal)',
    safetyStock: 8,
    reorderPoint: 18,
    leadTimeDays: 2,
    serviceLevel: '95% (Z=1.645)',
    status: 'AKTIF_TERUPDATE',
  },
  {
    productId: 'GORENGAN',
    productName: 'GORENGAN',
    category: 'Camilan & Keripik',
    demandType: 'Kontinu (Harian)',
    recommendedMethod: 'ARIMA (0,1,1)',
    horizonW1: 140,
    horizonW2: 150,
    horizonW3: 145,
    horizonW4: 160,
    rmse: '2.15 (Optimal)',
    safetyStock: 20,
    reorderPoint: 45,
    leadTimeDays: 1,
    serviceLevel: '95% (Z=1.645)',
    status: 'AKTIF_TERUPDATE',
  },
  {
    productId: 'KERIPIK-LABU',
    productName: 'KERIPIK LABU',
    category: 'Camilan & Keripik',
    demandType: 'Intermiten / Sporadis',
    recommendedMethod: 'Croston SBA',
    horizonW1: 18,
    horizonW2: 15,
    horizonW3: 22,
    horizonW4: 20,
    rmse: '1.85 (Optimal)',
    safetyStock: 12,
    reorderPoint: 25,
    leadTimeDays: 3,
    serviceLevel: '95% (Z=1.645)',
    status: 'AKTIF_TERUPDATE',
  },
  {
    productId: 'BAYAM',
    productName: 'BAYAM',
    category: 'Sayuran & Panen Segar',
    demandType: 'Kontinu (Musiman)',
    recommendedMethod: 'ARIMA (1,0,0)',
    horizonW1: 25,
    horizonW2: 28,
    horizonW3: 30,
    horizonW4: 32,
    rmse: '1.60 (Optimal)',
    safetyStock: 10,
    reorderPoint: 20,
    leadTimeDays: 2,
    serviceLevel: '95% (Z=1.645)',
    status: 'AKTIF_TERUPDATE',
  },
  {
    productId: 'BIBIT-SAYURAN',
    productName: 'BIBIT SAYURAN',
    category: 'Bibit & Sarana Tanam',
    demandType: 'Intermiten / Lambat',
    recommendedMethod: 'Croston SBA',
    horizonW1: 10,
    horizonW2: 8,
    horizonW3: 12,
    horizonW4: 10,
    rmse: '1.92 (Optimal)',
    safetyStock: 10,
    reorderPoint: 15,
    leadTimeDays: 4,
    serviceLevel: '95% (Z=1.645)',
    status: 'AKTIF_TERUPDATE',
  },
];

// Storage helpers
export function getStoredOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event('farmsight_orders_updated'));
  } catch (err) {
    console.error('Failed to save orders', err);
  }
}

export function getStoredMovements() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
      return INITIAL_MOVEMENTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_MOVEMENTS;
  }
}

export function saveStoredMovements(movements) {
  try {
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    window.dispatchEvent(new Event('farmsight_movements_updated'));
  } catch (err) {
    console.error('Failed to save movements', err);
  }
}

export function getStoredDraftInvoices() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DRAFT_INVOICES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => ({
      ...d,
      customerName: d.customerName || 'Ibu Dewi Permata',
      customerPhone: d.customerPhone || '+62 813-2233-4455',
      customerAddress: d.customerAddress || 'Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur',
      subtotalFormatted: d.subtotalFormatted || formatRupiah(d.subtotal || 0),
    }));
  } catch {
    return [];
  }
}

export function saveDraftInvoice(draft) {
  try {
    const drafts = getStoredDraftInvoices();
    const updated = [draft, ...drafts.filter((d) => d.invoiceNo !== draft.invoiceNo)];
    localStorage.setItem(STORAGE_KEY_DRAFT_INVOICES, JSON.stringify(updated));
    window.dispatchEvent(new Event('farmsight_draft_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to save draft invoice', err);
  }
}

export function getStoredForecasts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FORECASTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(INITIAL_FORECASTS));
      return INITIAL_FORECASTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_FORECASTS;
  }
}

export function saveStoredForecasts(forecasts) {
  try {
    localStorage.setItem(STORAGE_KEY_FORECASTS, JSON.stringify(forecasts));
    window.dispatchEvent(new Event('farmsight_forecasts_updated'));
  } catch (err) {
    console.error('Failed to save forecasts', err);
  }
}

// Business Process Functions
// 1. Check Stock Gateway
export function checkProductStock(productId, requestedQty) {
  const products = getStoredProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    return { sufficient: false, currentStock: 0, reason: 'Produk tidak ditemukan di database.' };
  }
  const isAvailable = product.isAvailable !== false;
  const currentStock = Number(product.stock) || 0;
  const sufficient = isAvailable && currentStock >= requestedQty;

  return {
    sufficient,
    currentStock,
    product,
    isAvailable,
    reason: !isAvailable
      ? 'Produk sedang berstatus Tidak Tersedia.'
      : currentStock < requestedQty
        ? `Stok fisik (${currentStock} ${product.unit}) kurang dari jumlah pesanan (${requestedQty} ${product.unit}).`
        : 'Stok tersedia mencukupi.',
  };
}

// 2. Create Order by Sales Admin
export function createSalesOrder({
  customerName,
  customerPhone,
  customerAddress,
  productId,
  quantity,
  draftInvoiceNo,
}) {
  const stockCheck = checkProductStock(productId, quantity);
  const products = getStoredProducts();
  const product = products.find((p) => p.id === productId);

  const newOrderId = `ORD-2026-${String(Math.floor(82 + Math.random() * 900)).padStart(3, '0')}`;
  const totalAmount = (product?.price || 0) * quantity;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

  if (!stockCheck.sufficient) {
    // GATEWAY 1: Insufficient Stock
    const cancelledOrder = {
      id: newOrderId,
      draftInvoiceNo: draftInvoiceNo || `DRAFT-INV-${Date.now().toString().slice(-6)}`,
      customerName,
      customerPhone,
      customerAddress,
      productId,
      productName: product?.name || 'Produk',
      unit: product?.unit || 'Pcs',
      price: product?.price || 0,
      quantity,
      totalAmount,
      status: 'DIBATALKAN',
      stockReserved: false,
      cancellationReason: `Stok tidak mencukupi (Tersedia: ${stockCheck.currentStock}, Diminta: ${quantity})`,
      createdAt: now,
    };

    const currentOrders = getStoredOrders();
    saveStoredOrders([cancelledOrder, ...currentOrders]);

    return {
      success: false,
      isInsufficientStock: true,
      currentStock: stockCheck.currentStock,
      order: cancelledOrder,
      message: `INSUFFICIENT STOCK NOTIFICATION: Stok tidak mencukupi untuk "${product?.name}". Pemesanan dibatalkan.`,
    };
  }

  // GATEWAY 1 SUKSES: Stock Sufficient -> Reservasi Stok & Kirim QR Code Pembayaran
  const newOrder = {
    id: newOrderId,
    draftInvoiceNo: draftInvoiceNo || `DRAFT-INV-${Date.now().toString().slice(-6)}`,
    customerName,
    customerPhone,
    customerAddress,
    productId,
    productName: product?.name || 'Produk',
    unit: product?.unit || 'Pcs',
    price: product?.price || 0,
    quantity,
    totalAmount,
    status: 'MENUNGGU_PEMBAYARAN',
    stockReserved: true,
    transferProofImage: null,
    transferAmount: null,
    createdAt: now,
  };

  const currentOrders = getStoredOrders();
  saveStoredOrders([newOrder, ...currentOrders]);

  return {
    success: true,
    isInsufficientStock: false,
    order: newOrder,
    message: `Stok tersedia. Sistem telah mereservasi stok dan menerbitkan QR Code Pembayaran senilai ${formatRupiah(totalAmount)}.`,
  };
}

// 3. Customer Uploads / Submits Transfer Proof
export function submitTransferProof(orderId, proofImageUrl, transferAmount) {
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Pesanan tidak ditemukan');

  const updatedOrders = orders.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status: 'BUKTI_DIKIRIM',
        transferProofImage: proofImageUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
        transferAmount: Number(transferAmount) || o.totalAmount,
      };
    }
    return o;
  });

  saveStoredOrders(updatedOrders);
  return true;
}

// 4. GATEWAY 2: Verify Transfer Amount & Confirm Order OR Request Re-transfer
export function verifyAndConfirmPayment(orderId, isAmountValid, customNote) {
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Pesanan tidak ditemukan');

  if (!isAmountValid) {
    // GATEWAY 2 - TIDAK SESUAI: Sales Admin meminta customer buat transfer ulang
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'PERLU_TRANSFER_ULANG',
          reTransferNote: customNote || `Nominal transfer (Rp ${Number(o.transferAmount || 0).toLocaleString('id-ID')}) belum sesuai dengan total tagihan (${formatRupiah(o.totalAmount)}). Silakan transfer ulang kekurangannya.`,
        };
      }
      return o;
    });

    saveStoredOrders(updatedOrders);
    return {
      success: false,
      status: 'PERLU_TRANSFER_ULANG',
      message: `Nominal belum sesuai. Notifikasi permintaan transfer ulang sebesar ${formatRupiah(order.totalAmount)} telah dikirim ke pelanggan.`,
    };
  }

  // GATEWAY 2 - SESUAI: Sales Admin mengkonfirmasi pembayaran di sistem / Confirm Order
  // 1) Update Status Pesanan ke SELESAI
  const updatedOrders = orders.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status: 'SELESAI',
        stockReserved: false,
        confirmedAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      };
    }
    return o;
  });
  saveStoredOrders(updatedOrders);

  // 2) SISTEM OTOMATIS MENGURANGI JUMLAH STOK PRODUK SECARA RIIL
  const products = getStoredProducts();
  let remainingStockAfter = 0;
  let targetProduct = null;

  const updatedProducts = products.map((p) => {
    if (p.id === order.productId) {
      const newStock = Math.max(0, (p.stock || 0) - order.quantity);
      remainingStockAfter = newStock;
      targetProduct = { ...p, stock: newStock };
      return targetProduct;
    }
    return p;
  });
  saveStoredProducts(updatedProducts);

  // 3) ROLE STOCK MANAGER MENCATAT HISTORI PERGERAKAN STOK / STOCK MOVEMENT
  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  const newMovement = {
    id: `MOV-${String(Math.floor(100 + Math.random() * 900))}`,
    date: nowStr,
    productId: order.productId,
    productName: order.productName,
    type: 'OUT',
    category: 'Penjualan Terkonfirmasi',
    reference: order.id,
    quantity: -order.quantity,
    remainingStock: remainingStockAfter,
    operator: 'Sistem Terintegrasi (Sales Admin Confirmation)',
  };
  const movements = getStoredMovements();
  saveStoredMovements([newMovement, ...movements]);

  // 4) GATEWAY 3: REORDER POINT (ROP) CHECK
  // Sisa stok <= Reorder Point?
  const rop = targetProduct?.reorderPoint || targetProduct?.minStock || 15;
  const isRopTriggered = remainingStockAfter <= rop;
  const ropAlert = isRopTriggered
    ? `ALERT: Sisa stok ${order.productName} (${remainingStockAfter} ${order.unit}) telah menyentuh batas Reorder Point (ROP: ${rop} unit). Status: PERLU RESTOCK!`
    : `Status stok ${order.productName} AMAN (${remainingStockAfter} ${order.unit} > ROP ${rop} unit).`;

  return {
    success: true,
    status: 'SELESAI',
    remainingStock: remainingStockAfter,
    isRopTriggered,
    ropAlert,
    message: `Pembayaran pesanan ${order.id} berhasil dikonfirmasi. Stok otomatis berkurang ${order.quantity} unit. Mutasi stok berhasil dicatat.`,
  };
}

