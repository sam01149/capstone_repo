// FarmSight Orders, Inventory & Business Process Data Engine
// Handles: Customer Draft Invoices, Sales Orders, Gateway Verifications,
// QRIS Payment, Stock Deduction, Stock Movement, ROP Alerts, Demand Forecasting, and Reports.

import { getStoredProducts, saveStoredProducts, formatRupiah } from './productsData';

const STORAGE_KEY_ORDERS = 'farmsight_orders_db_v2';
const STORAGE_KEY_MOVEMENTS = 'farmsight_stock_movements_v1';
const STORAGE_KEY_DRAFT_INVOICES = 'farmsight_draft_invoices_v1';
const STORAGE_KEY_FORECASTS = 'farmsight_forecasts_data_v1';

// Sample Authentic Indonesian Banking Receipts (SVG Data URLs for 100% reliable offline rendering)
const generateReceiptSvg = (bankName, color, sender, amount, refNo, time) => {
  const formattedAmt = `Rp ${Number(amount).toLocaleString('id-ID')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640" style="background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <rect width="480" height="640" fill="#f8fafc"/>
    <rect x="24" y="24" width="432" height="592" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Header Bank -->
    <rect x="24" y="24" width="432" height="80" rx="16" fill="${color}"/>
    <rect x="24" y="80" width="432" height="24" fill="${color}"/>
    <text x="50" y="74" fill="#ffffff" font-size="22" font-weight="800" letter-spacing="0.5">${bankName}</text>
    <circle cx="410" cy="64" r="16" fill="#ffffff" opacity="0.25"/>
    <path d="M403 64 L408 69 L418 59" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    
    <!-- Success Badge -->
    <circle cx="240" cy="150" r="32" fill="#dcfce7"/>
    <path d="M228 150 L236 158 L252 142" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="240" y="202" fill="#15803d" font-size="16" font-weight="800" text-anchor="middle">TRANSAKSI BERHASIL</text>
    <text x="240" y="222" fill="#64748b" font-size="12" text-anchor="middle">${time || '05 Nov 2026, 21:05 WIB'}</text>
    
    <!-- Amount Display -->
    <rect x="54" y="240" width="372" height="68" rx="12" fill="#f1f5f9"/>
    <text x="240" y="262" fill="#64748b" font-size="12" font-weight="600" text-anchor="middle">TOTAL DITRANSFER</text>
    <text x="240" y="292" fill="#0f172a" font-size="24" font-weight="900" text-anchor="middle">${formattedAmt}</text>
    
    <!-- Transaction Details -->
    <line x1="54" y1="330" x2="426" y2="330" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 4"/>
    
    <text x="54" y="360" fill="#64748b" font-size="12">Penerima Merchant</text>
    <text x="426" y="360" fill="#0f172a" font-size="13" font-weight="700" text-anchor="end">TOKO FARM BERKAH</text>
    
    <text x="54" y="392" fill="#64748b" font-size="12">NMID Merchant</text>
    <text x="426" y="392" fill="#0f172a" font-size="12" font-weight="600" font-family="monospace" text-anchor="end">ID1026508798372</text>
    
    <text x="54" y="424" fill="#64748b" font-size="12">Pengirim Dana</text>
    <text x="426" y="424" fill="#0f172a" font-size="13" font-weight="700" text-anchor="end">${sender || 'Customer'}</text>
    
    <text x="54" y="456" fill="#64748b" font-size="12">Metode Transaksi</text>
    <text x="426" y="456" fill="#0f172a" font-size="12" font-weight="600" text-anchor="end">QRIS Domestik (GPN)</text>
    
    <text x="54" y="488" fill="#64748b" font-size="12">No. Referensi / RRN</text>
    <text x="426" y="488" fill="#0f172a" font-size="11" font-weight="600" font-family="monospace" text-anchor="end">${refNo || 'QRIS-FB-20261105-091'}</text>
    
    <!-- Footer Verified -->
    <rect x="54" y="525" width="372" height="60" rx="10" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
    <text x="240" y="550" fill="#065f46" font-size="12" font-weight="700" text-anchor="middle">✓ Resi Pembayaran Resmi Terverifikasi</text>
    <text x="240" y="568" fill="#047857" font-size="11" text-anchor="middle">Simpan resi ini sebagai bukti pembayaran yang sah.</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Realistic Indonesian Bank & E-Wallet Receipts for Demonstration
export const DUMMY_TRANSFER_PROOFS = [
  {
    id: 'PROOF-BCA',
    bank: 'BCA mobile (QRIS)',
    sender: 'wara',
    amount: 20000,
    time: '5 Nov 2026, 21:05 WIB',
    refNo: 'BCA-QRIS-20261105-88912',
    imageUrl: generateReceiptSvg('BCA mobile', '#005baa', 'wara (081387140879)', 20000, 'BCA-QRIS-20261105-88912', '5 Nov 2026, 21:05 WIB'),
    title: 'Struk QRIS BCA Mobile (Rp 20.000)',
  },
  {
    id: 'PROOF-MANDIRI',
    bank: 'Livin\' by Mandiri (QRIS)',
    sender: 'Ibu Dewi Permata',
    amount: 20000,
    time: '5 Nov 2026, 21:12 WIB',
    refNo: 'MDR-QRIS-20261105-77401',
    imageUrl: generateReceiptSvg('Livin\' by Mandiri', '#003d79', 'Ibu Dewi Permata', 20000, 'MDR-QRIS-20261105-77401', '5 Nov 2026, 21:12 WIB'),
    title: 'Struk Livin Mandiri QRIS (Rp 20.000)',
  },
  {
    id: 'PROOF-GOPAY',
    bank: 'GoPay / QRIS Nasional',
    sender: 'wara',
    amount: 20000,
    time: '5 Nov 2026, 21:15 WIB',
    refNo: 'GPY-QRIS-20261105-99411',
    imageUrl: generateReceiptSvg('GoPay Indonesia', '#0081a7', 'wara', 20000, 'GPY-QRIS-20261105-99411', '5 Nov 2026, 21:15 WIB'),
    title: 'Struk GoPay QRIS (Rp 20.000)',
  },
  {
    id: 'PROOF-BRI',
    bank: 'BRImo (QRIS Transfer)',
    sender: 'Bpk. Hendra Wijaya',
    amount: 25000,
    time: '4 Nov 2026, 15:48 WIB',
    refNo: 'BRI-QRIS-20261104-33109',
    imageUrl: generateReceiptSvg('BRImo', '#00529b', 'Bpk. Hendra Wijaya', 25000, 'BRI-QRIS-20261104-33109', '4 Nov 2026, 15:48 WIB'),
    title: 'Struk BRImo QRIS (Rp 25.000)',
  },
  {
    id: 'PROOF-DANA',
    bank: 'DANA Digital Wallet',
    sender: 'Ibu Siti Rahayu',
    amount: 40000,
    time: '4 Nov 2026, 11:35 WIB',
    refNo: 'DANA-QRIS-20261104-11883',
    imageUrl: generateReceiptSvg('DANA Wallet', '#118eea', 'Ibu Siti Rahayu', 40000, 'DANA-QRIS-20261104-11883', '4 Nov 2026, 11:35 WIB'),
    title: 'Struk DANA QRIS (Rp 40.000)',
  },
];

// Initial Orders: Dikosongkan sesuai permintaan pengguna (hanya diisi pesanan masuk riil/simulasi WhatsApp)
export const INITIAL_ORDERS = [];

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
    const orders = data ? JSON.parse(data) : INITIAL_ORDERS;
    if (!Array.isArray(orders) || orders.length === 0) return INITIAL_ORDERS;
    return orders.map((o) => {
      const g1 = o.gateway1Status || (o.status === 'DIBATALKAN' ? 'GAGAL' : 'LOLOS');
      let g2 = o.gateway2Status;
      if (!g2) {
        if (o.status === 'SELESAI') g2 = 'LOLOS';
        else if (o.status === 'PERLU_TRANSFER_ULANG') g2 = 'TRANSFER_ULANG';
        else if (o.status === 'SUDAH_BAYAR' || o.transferProofImage) g2 = 'SUDAH_BAYAR';
        else g2 = 'MENUNGGU_BAYAR';
      }
      return {
        ...o,
        gateway1Status: g1,
        gateway2Status: g2,
      };
    });
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

export function resetStoredOrdersToDefault() {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
    window.dispatchEvent(new Event('farmsight_orders_updated'));
    return INITIAL_ORDERS;
  } catch (err) {
    console.error('Failed to reset orders', err);
    return INITIAL_ORDERS;
  }
}

// Simulasi pesanan masuk via WhatsApp customer untuk kemudahan pengujian
export function simulateCustomerWhatsAppOrder(productId = 'GORENGAN', quantity = 10, customerName = 'Ibu Dewi Permata', customerPhone = '+62 813-2233-4455') {
  return createSalesOrder({
    customerName,
    customerPhone,
    customerAddress: 'Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur',
    productId,
    quantity,
    draftInvoiceNo: `DRAFT-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
  });
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

    const orders = getStoredOrders();
    const existingDraftNos = new Set(orders.map((o) => o.draftInvoiceNo).filter(Boolean));

    const seen = new Set();
    const uniqueDrafts = [];

    for (const d of parsed) {
      if (existingDraftNos.has(d.invoiceNo)) continue;
      const key = `${(d.customerPhone || '').replace(/[^0-9]/g, '')}-${d.productId}-${d.quantity}`;
      if (seen.has(key)) continue;
      seen.add(key);

      uniqueDrafts.push({
        ...d,
        customerName: d.customerName || 'Customer',
        customerPhone: d.customerPhone || '-',
        customerAddress: d.customerAddress || '-',
        subtotalFormatted: d.subtotalFormatted || formatRupiah(d.subtotal || 0),
      });
    }

    return uniqueDrafts;
  } catch {
    return [];
  }
}

export function saveDraftInvoice(draft) {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DRAFT_INVOICES);
    const drafts = data ? JSON.parse(data) : [];
    const cleanPhone = (draft.customerPhone || '').replace(/[^0-9]/g, '');
    const filtered = drafts.filter(
      (d) =>
        d.invoiceNo !== draft.invoiceNo &&
        !(cleanPhone && cleanPhone.length > 5 && (d.customerPhone || '').replace(/[^0-9]/g, '') === cleanPhone && d.productId === draft.productId)
    );
    const updated = [draft, ...filtered];
    localStorage.setItem(STORAGE_KEY_DRAFT_INVOICES, JSON.stringify(updated));
    window.dispatchEvent(new Event('farmsight_draft_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to save draft invoice', err);
  }
}

export function removeDraftInvoice(invoiceNo) {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DRAFT_INVOICES);
    if (!data) return [];
    const drafts = JSON.parse(data);
    const updated = drafts.filter((d) => d.invoiceNo !== invoiceNo);
    localStorage.setItem(STORAGE_KEY_DRAFT_INVOICES, JSON.stringify(updated));
    window.dispatchEvent(new Event('farmsight_draft_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to remove draft invoice', err);
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
// 1. Check Stock Gateway (Gateway 1)
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

// 2. Create Order by Sales Admin (Gateway 1)
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
      gateway1Status: 'GAGAL',
      gateway2Status: 'DIBATALKAN',
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

  // GATEWAY 1 SUKSES: Stock Sufficient -> Reservasi Stok & Status Awal Menunggu Pembayaran
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
    gateway1Status: 'LOLOS',
    gateway2Status: 'MENUNGGU_BAYAR',
    stockReserved: true,
    transferProofImage: null,
    transferAmount: null,
    transferBank: null,
    transferTime: null,
    createdAt: now,
  };

  const currentOrders = getStoredOrders();
  saveStoredOrders([newOrder, ...currentOrders]);

  if (draftInvoiceNo) {
    removeDraftInvoice(draftInvoiceNo);
  }

  return {
    success: true,
    isInsufficientStock: false,
    order: newOrder,
    message: `Stok tersedia & direservasi. QR Code Pembayaran Toko Farm Berkah senilai ${formatRupiah(totalAmount)} siap dikirim ke customer.`,
  };
}

// 3. Helper: Generate WhatsApp URL from Sales Admin to Customer (Sends QRIS & Payment Confirmation Link)
export function generateCustomerQrisWhatsAppUrl(order) {
  const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  const phoneTarget = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tokofarmberkah.id';
  const paymentLink = `${baseUrl}?bayar=${order.id}`;

  const message = [
    `Halo kak ${order.customerName || 'Pelanggan'},`,
    `Terima kasih telah memesan produk segar & higienis di Toko Farm Berkah! 🌿`,
    ``,
    `Berikut rincian pesanan Anda yang telah divalidasi ketersediaan stok fisiknya:`,
    `• No. Pesanan: ${order.id}`,
    `• Produk: ${order.productName} (${order.quantity} unit)`,
    `• Total Tagihan: ${formatRupiah(order.totalAmount)}`,
    ``,
    `💳 METODE PEMBAYARAN RESMI (QRIS TOKO FARM BERKAH):`,
    `• QRIS NMID: ID1026508798372`,
    `• Atas Nama: Toko Farm Berkah`,
    `• Nominal Transfer: ${formatRupiah(order.totalAmount)} (Tepat)`,
    ``,
    `📲 Link Konfirmasi Pembayaran & Unduh QRIS:`,
    `${paymentLink}`,
    ``,
    `Setelah Anda melakukan transfer scan QRIS, mohon kirimkan foto struk/bukti pembayaran melalui link di atas atau balas langsung ke WhatsApp ini.`,
    ``,
    `Salam hangat,`,
    `Sales Admin Toko Farm Berkah`,
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${phoneTarget}&text=${encodeURIComponent(message)}`;
}

// Helper: Generate WhatsApp URL to notify customer for re-transfer when nominal doesn't match
export function generateReTransferWhatsAppUrl(order, customReason) {
  const cleanPhone = (order?.customerPhone || '').replace(/[^0-9]/g, '');
  const phoneTarget = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const reason = customReason || `Nominal transfer (Rp ${Number(order?.transferAmount || 0).toLocaleString('id-ID')}) belum sesuai dengan total tagihan (${formatRupiah(order?.totalAmount || 0)}). Silakan transfer ulang kekurangannya ke QRIS resmi Toko Farm Berkah.`;
  const message = [
    `Halo kak ${order?.customerName || 'Pelanggan'},`,
    `Pemberitahuan dari Sales Admin Toko Farm Berkah terkait pesanan #${order?.id}:`,
    ``,
    `⚠️ ${reason}`,
    ``,
    `💳 QRIS RESMI TOKO FARM BERKAH:`,
    `• NMID: ID1026508798372`,
    `• Atas Nama: Toko Farm Berkah`,
    `• Total Tagihan Resmi: ${formatRupiah(order?.totalAmount || 0)}`,
    ``,
    `Mohon kirimkan kembali foto struk bukti transfer yang baru ke WhatsApp ini setelah melakukan transfer. Terima kasih! 🙏`,
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${phoneTarget}&text=${encodeURIComponent(message)}`;
}

// 4. Helper: Generate WhatsApp URL from Customer to Sales Admin (Customer sends Proof)
export function generateCustomerProofWhatsAppUrl(order, proofDetails = {}) {
  const adminPhone = '6281216146510'; // WhatsApp Sales Admin Toko Farm Berkah
  const finalAmount = proofDetails.amount || order.totalAmount;

  const message = [
    `Halo Sales Admin Toko Farm Berkah,`,
    `Saya telah melakukan pembayaran via QRIS resmi Toko Farm Berkah untuk pesanan saya:`,
    ``,
    `• No. Pesanan: ${order.id}`,
    `• Nama Pembeli: ${order.customerName}`,
    `• Produk: ${order.productName} (${order.quantity} unit)`,
    `• Nominal Transfer: ${formatRupiah(finalAmount)}`,
    `• Bank / E-Wallet Pengirim: ${proofDetails.bank || 'QRIS'}`,
    `• Waktu Transfer: ${new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}`,
    ``,
    `Bukti pembayaran terlampir. Mohon verifikasi pembayaran dan segera proses pesanan saya. Terima kasih! 🙏`,
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(message)}`;
}

// 5. Customer Submits Payment Proof (Updates Order Status to SUDAH_BAYAR)
export function submitTransferProof(orderId, proofImageUrl, transferAmount, bankName, customerNote) {
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Pesanan tidak ditemukan');

  const finalAmount = Number(transferAmount) || order.totalAmount;
  const finalProof = proofImageUrl || DUMMY_TRANSFER_PROOFS[0].imageUrl;
  const finalBank = bankName || 'BCA mobile (QRIS)';
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

  const updatedOrders = orders.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status: 'SUDAH_BAYAR',
        gateway2Status: 'SUDAH_BAYAR',
        transferProofImage: finalProof,
        transferAmount: finalAmount,
        transferBank: finalBank,
        transferTime: now,
        customerTransferNote: customerNote || '',
      };
    }
    return o;
  });

  saveStoredOrders(updatedOrders);
  return {
    success: true,
    order: updatedOrders.find((o) => o.id === orderId),
    message: `Bukti transfer pesanan ${orderId} berhasil dikirim ke Sales Admin! Status saat ini: Sudah Bayar (Menunggu Verifikasi).`,
  };
}

// 6. GATEWAY 2: Verify Transfer Amount & Confirm Order OR Request Re-transfer
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
          gateway2Status: 'TRANSFER_ULANG',
          reTransferNote: customNote || `Nominal transfer (Rp ${Number(o.transferAmount || 0).toLocaleString('id-ID')}) belum sesuai dengan total tagihan (${formatRupiah(o.totalAmount)}). Silakan transfer ulang kekurangannya.`,
        };
      }
      return o;
    });

    saveStoredOrders(updatedOrders);
    return {
      success: false,
      status: 'PERLU_TRANSFER_ULANG',
      order: updatedOrders.find((o) => o.id === orderId),
      message: `Nominal belum sesuai. Notifikasi permintaan transfer ulang sebesar ${formatRupiah(order.totalAmount)} telah dikirim ke pelanggan.`,
    };
  }

  // GATEWAY 2 - SESUAI: Sales Admin mengkonfirmasi pembayaran di sistem / Confirm Order
  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  const updatedOrders = orders.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status: 'SELESAI',
        gateway2Status: 'LOLOS',
        stockReserved: false,
        confirmedAt: nowStr,
      };
    }
    return o;
  });
  saveStoredOrders(updatedOrders);

  // SISTEM OTOMATIS MENGURANGI JUMLAH STOK PRODUK SECARA RIIL
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

  // STOCK MANAGER: MENCATAT HISTORI PERGERAKAN STOK / STOCK MOVEMENT (OUT)
  const newMovement = {
    id: `MOV-${String(Math.floor(100 + Math.random() * 900))}`,
    date: nowStr,
    productId: order.productId,
    productName: order.productName,
    type: 'OUT',
    category: 'Penjualan Pesanan',
    reference: order.id,
    quantity: -order.quantity,
    remainingStock: remainingStockAfter,
    operator: 'Sales Admin (Konfirmasi Gateway 2)',
  };
  const movements = getStoredMovements();
  saveStoredMovements([newMovement, ...movements]);

  // GATEWAY 3: REORDER POINT (ROP) CHECK
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
    order: updatedOrders.find((o) => o.id === orderId),
    message: `Pembayaran pesanan ${order.id} berhasil dikonfirmasi (Gateway 2 Lolos). Sisa stok: ${remainingStockAfter} unit. Histori mutasi stok tercatat.`,
  };
}

// -------------------------------------------------------------
// FARMSIGHT MASTER DATASET (SESUAI DOKUMENTASI & DESAIN CAPSTONE)
// -------------------------------------------------------------

// 38 Produk Terintegrasi FarmSight (Pemantauan Model - Screenshot 3)
export const FARMSIGHT_MODEL_MONITORING_DATA = [
  { code: 'BLB', name: 'BIBIT LIDAH BUAYA', bestModel: 'Belum tersedia', rmse: '0.02', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'BMG', name: 'BAWANG MERAH GORENG', bestModel: 'Belum tersedia', rmse: '2.63', safetyStock: '0.1', rop: '0.11', status: 'Metode heuristik' },
  { code: 'BSY', name: 'BIBIT SAYURAN', bestModel: 'Belum tersedia', rmse: '0.02', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'BYM', name: 'BAYAM', bestModel: 'Belum tersedia', rmse: '0.20', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'CKP', name: 'COKELAT PERMEN', bestModel: 'CROSTON_SBA', rmse: '3.60', safetyStock: '1.71', rop: '2.07', status: 'Tersedia' },
  { code: 'CRG', name: 'CURING', bestModel: 'Belum tersedia', rmse: '3.34', safetyStock: '0.1', rop: '0.13', status: 'Metode heuristik' },
  { code: 'GRG', name: 'GORENGAN', bestModel: 'Belum tersedia', rmse: '7.02', safetyStock: '0.22', rop: '0.33', status: 'Metode heuristik' },
  { code: 'HLP', name: 'HASIL PANEN', bestModel: 'Belum tersedia', rmse: '2.39', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'JGG', name: 'JAGUNG', bestModel: 'Belum tersedia', rmse: '0.70', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'JHE', name: 'JAHE', bestModel: 'Belum tersedia', rmse: '3.65', safetyStock: '1.24', rop: '1.5', status: 'Metode heuristik' },
  { code: 'KCT', name: 'KACANG TELOR', bestModel: 'Belum tersedia', rmse: '3.00', safetyStock: '0.1', rop: '0.11', status: 'Metode heuristik' },
  { code: 'KJB', name: 'KERIPIK JAGUNG MANIS', bestModel: 'Belum tersedia', rmse: '2.88', safetyStock: '0.12', rop: '0.18', status: 'Metode heuristik' },
  { code: 'KKG', name: 'KANGKUNG', bestModel: 'ARIMA', rmse: '0.70', safetyStock: '0.51', rop: '0.77', status: 'Tersedia' },
  { code: 'KMG', name: 'KEMANGI', bestModel: 'Belum tersedia', rmse: '1.90', safetyStock: '0.75', rop: '0.91', status: 'Metode heuristik' },
  { code: 'KNZ', name: 'KUNYIT', bestModel: 'Belum tersedia', rmse: '0.01', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'KPB', name: 'KERIPIK PANGSIT', bestModel: 'Belum tersedia', rmse: '0.38', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'KRL', name: 'KERIPIK LABU', bestModel: 'Belum tersedia', rmse: '2.03', safetyStock: '0.29', rop: '0.39', status: 'Metode heuristik' },
  { code: 'KRY', name: 'KERIPIK BAYAM', bestModel: 'Belum tersedia', rmse: '2.02', safetyStock: '0.14', rop: '0.19', status: 'Metode heuristik' },
  { code: 'LBP', name: 'LABU PARANG', bestModel: 'ARIMA', rmse: '1.42', safetyStock: '0.29', rop: '0.36', status: 'Tersedia' },
  { code: 'LDB', name: 'LIDAH BUAYA', bestModel: 'ARIMA', rmse: '1.97', safetyStock: '0.52', rop: '0.77', status: 'Tersedia' },
  { code: 'MLT', name: 'MELATI WANGI', bestModel: 'ARIMA', rmse: '2.52', safetyStock: '2.11', rop: '2.51', status: 'Tersedia' },
  { code: 'MLB', name: 'MINUMAN LIDAH BUAYA', bestModel: 'CROSTON_SBA', rmse: '17.01', safetyStock: '12.77', rop: '15.13', status: 'Tersedia' },
  { code: 'MNJ', name: 'MINUMAN JAHE', bestModel: 'Belum tersedia', rmse: '4.55', safetyStock: '0.22', rop: '0.34', status: 'Metode heuristik' },
  { code: 'MNM', name: 'MINUMAN', bestModel: 'Belum tersedia', rmse: '2.2', safetyStock: '0.6', rop: '0.81', status: 'Metode heuristik' },
  { code: 'MST', name: 'MINUMAN LEMON', bestModel: 'Belum tersedia', rmse: '2.47', safetyStock: '0.79', rop: '0.87', status: 'Metode heuristik' },
  { code: 'PAC', name: 'PAKCOY', bestModel: 'Belum tersedia', rmse: '0', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'PLB', name: 'PERMEN LIDAH BUAYA', bestModel: 'Belum tersedia', rmse: '2.2', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'PNA', name: 'PISANG RAJA', bestModel: 'ARIMA', rmse: '1.47', safetyStock: '0.4', rop: '0.54', status: 'Tersedia' },
  { code: 'PNP', name: 'PUPUK CAIR', bestModel: 'Belum tersedia', rmse: '0', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'PPK', name: 'PUPUK', bestModel: 'ARIMA', rmse: '2.91', safetyStock: '1.77', rop: '1.84', status: 'Tersedia' },
  { code: 'PSR', name: 'PISANG BULAN', bestModel: 'ARIMA', rmse: '2.49', safetyStock: '1.53', rop: '1.75', status: 'Tersedia' },
  { code: 'PTL', name: 'PUPUK BASAH', bestModel: 'Belum tersedia', rmse: '0', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'RJN', name: 'RAJANG KANGKUNG', bestModel: 'Belum tersedia', rmse: '0.03', safetyStock: '0.29', rop: '0.37', status: 'Metode heuristik' },
  { code: 'SAW', name: 'SAWI', bestModel: 'Belum tersedia', rmse: '0.03', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'SLD', name: 'SELADA', bestModel: 'Belum tersedia', rmse: '0.24', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'STR', name: 'SAYUR', bestModel: 'Belum tersedia', rmse: '0.24', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
  { code: 'TTL', name: 'TEH BUNGA TELANG', bestModel: 'Belum tersedia', rmse: '2.84', safetyStock: '0.29', rop: '0.33', status: 'Metode heuristik' },
  { code: 'UBE', name: 'UREA', bestModel: 'Belum tersedia', rmse: '0', safetyStock: 'Belum tersedia', rop: 'Belum tersedia', status: 'Tidak aktif' },
];

// Log Pergerakan Inventaris Terpadu (Screenshot 2)
export const FARMSIGHT_INVENTORY_LOGS = [
  { productId: 'BLB', productName: 'BIBIT LIDAH BUAYA', prodDate: '25/01/2024', orderDate: '25/01/2024', stock: 6 },
  { productId: 'BLB', productName: 'BIBIT LIDAH BUAYA', prodDate: '02/08/2024', orderDate: '31/07/2024', stock: 5 },
  { productId: 'BLB', productName: 'BIBIT LIDAH BUAYA', prodDate: '26/09/2025', orderDate: '26/09/2025', stock: 1 },
  { productId: 'BLB', productName: 'BIBIT LIDAH BUAYA', prodDate: '03/12/2025', orderDate: '01/12/2025', stock: 1 },
  { productId: 'BMG', productName: 'BAWANG MERAH GORENG', prodDate: '16/06/2024', orderDate: '16/06/2024', stock: 2 },
  { productId: 'BMG', productName: 'BAWANG MERAH GORENG', prodDate: '15/05/2026', orderDate: '15/05/2026', stock: 8 },
  { productId: 'BSY', productName: 'BIBIT SAYURAN', prodDate: '22/04/2026', orderDate: '20/04/2026', stock: 15 },
  { productId: 'BYM', productName: 'BAYAM SEGAR', prodDate: '05/11/2026', orderDate: '04/11/2026', stock: 18 },
  { productId: 'CKP', productName: 'COKELAT PERMEN', prodDate: '01/11/2026', orderDate: '02/11/2026', stock: 35 },
  { productId: 'GRG', productName: 'GORENGAN', prodDate: '05/11/2026', orderDate: '05/11/2026', stock: 60 },
  { productId: 'KKG', productName: 'KANGKUNG HIDROPONIK', prodDate: '04/11/2026', orderDate: '04/11/2026', stock: 25 },
  { productId: 'KRL', productName: 'KERIPIK LABU', prodDate: '03/11/2026', orderDate: '03/11/2026', stock: 45 },
  { productId: 'LBP', productName: 'LABU PARANG', prodDate: '02/11/2026', orderDate: '02/11/2026', stock: 20 },
  { productId: 'LDB', productName: 'LIDAH BUAYA ORGANIK', prodDate: '04/11/2026', orderDate: '04/11/2026', stock: 30 },
  { productId: 'MLB', productName: 'MINUMAN LIDAH BUAYA', prodDate: '05/11/2026', orderDate: '05/11/2026', stock: 40 },
  { productId: 'TTL', productName: 'TEH BUNGA TELANG', prodDate: '05/11/2026', orderDate: '05/11/2026', stock: 24 },
];

// Data Horizon Forecast Pendapatan (Screenshot 1 & 4)
export const FARMSIGHT_FORECAST_HORIZONS = {
  1: {
    totalRevenue: 'Rp 82.300',
    avgWeekly: 'Rp 82.300',
    totalDemand: '7,2 unit',
    activeProducts: '9 produk',
    bars: [{ label: '5 Okt', value: 82.3, height: 30 }],
  },
  2: {
    totalRevenue: 'Rp 142.900',
    avgWeekly: 'Rp 71.450',
    totalDemand: '12,8 unit',
    activeProducts: '9 produk',
    bars: [
      { label: '5 Okt', value: 82.3, height: 30 },
      { label: '12 Okt', value: 142.9, height: 52 },
    ],
  },
  3: {
    totalRevenue: 'Rp 209.300',
    avgWeekly: 'Rp 69.766',
    totalDemand: '18,5 unit',
    activeProducts: '9 produk',
    bars: [
      { label: '5 Okt', value: 82.3, height: 30 },
      { label: '12 Okt', value: 142.9, height: 52 },
      { label: '19 Okt', value: 209.3, height: 76 },
    ],
  },
  4: {
    totalRevenue: 'Rp 273.049',
    avgWeekly: 'Rp 68.262',
    totalDemand: '24,6 unit',
    activeProducts: '9 produk',
    bars: [
      { label: '5 Okt', value: 82.3, height: 30 },
      { label: '12 Okt', value: 142.9, height: 52 },
      { label: '19 Okt', value: 209.3, height: 76 },
      { label: '26 Okt', value: 273.0, height: 100 },
    ],
  },
};

