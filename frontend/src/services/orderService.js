import { INITIAL_ORDERS, INITIAL_DRAFTS, OFFICIAL_STORE_INFO } from '../mocks/ordersAndInventoryData';
import { ORDER_STATUS } from '../types';
import { delay, request, USE_REAL_BACKEND } from './apiClient';
import { productService } from './productService';
import { inventoryService } from './inventoryService';
import { notificationService } from './notificationService';

const STORAGE_ORDERS = 'farmsight_orders_db_v1';
const STORAGE_DRAFTS = 'farmsight_drafts_db_v1';

function getLocalOrders() {
  const d = localStorage.getItem(STORAGE_ORDERS);
  let orders;
  if (!d) {
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  try {
    orders = JSON.parse(d);
  } catch {
    orders = INITIAL_ORDERS;
  }
  if (Array.isArray(orders) && orders.some((o) => o && (o.id === 'ORD-2026-328' || String(o.id).includes('328')))) {
    orders = orders.filter((o) => !(o && (o.id === 'ORD-2026-328' || String(o.id).includes('328'))));
    try {
      localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
      window.dispatchEvent(new Event('farmsight_orders_updated'));
    } catch (e) {
      // ignore
    }
  }
  return orders;
}

function saveLocalOrders(orders) {
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('farmsight_orders_updated'));
}

function getLocalDrafts() {
  const d = localStorage.getItem(STORAGE_DRAFTS);
  if (!d) {
    localStorage.setItem(STORAGE_DRAFTS, JSON.stringify(INITIAL_DRAFTS));
    return INITIAL_DRAFTS;
  }
  return JSON.parse(d);
}

function saveLocalDrafts(drafts) {
  localStorage.setItem(STORAGE_DRAFTS, JSON.stringify(drafts));
  window.dispatchEvent(new Event('farmsight_drafts_updated'));
}

export const orderService = {
  async getOrders(filters = {}) {
    if (USE_REAL_BACKEND) {
      const q = new URLSearchParams(filters).toString();
      return request(`/orders?${q}`);
    }

    await delay(180);
    let list = getLocalOrders();

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((o) => o.status === filters.status);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          o.customerName.toLowerCase().includes(s) ||
          o.customerPhone.includes(s) ||
          o.productName.toLowerCase().includes(s)
      );
    }

    return list;
  },

  async getOrderById(id) {
    if (USE_REAL_BACKEND) return request(`/orders/${id}`);
    await delay(100);
    const list = getLocalOrders();
    const order = list.find((o) => o.id === id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    return order;
  },

  async getDraftInvoices() {
    if (USE_REAL_BACKEND) return request('/orders/drafts');
    await delay(150);
    return getLocalDrafts();
  },

  async saveDraftInvoice(draft) {
    if (USE_REAL_BACKEND) return request('/orders/drafts', { method: 'POST', body: JSON.stringify(draft) });
    const drafts = getLocalDrafts();
    const exists = drafts.some((d) => d.invoiceNo === draft.invoiceNo);
    if (!exists) {
      saveLocalDrafts([draft, ...drafts]);
      notificationService.sendNotification({
        roleTarget: 'SALES_ADMIN',
        title: 'Pesanan Masuk via WhatsApp',
        message: `${draft.customerName} mengirim pesanan ${draft.productName} (${draft.quantity} unit).`,
        type: 'INFO',
        link: '/sales/inbox',
      });
    }
    return draft;
  },

  async deleteDraftInvoice(invoiceNo) {
    if (USE_REAL_BACKEND) return request(`/orders/drafts/${invoiceNo}`, { method: 'DELETE' });
    const drafts = getLocalDrafts().filter((d) => d.invoiceNo !== invoiceNo);
    saveLocalDrafts(drafts);
    return true;
  },

  async getReservedQty(productId, excludeOrderId) {
    const orders = getLocalOrders();
    const activeReserved = [
      ORDER_STATUS.MENUNGGU_PEMBAYARAN,
      ORDER_STATUS.PERLU_TRANSFER_ULANG,
    ];
    return orders
      .filter((o) => o.productId === productId && o.id !== excludeOrderId && activeReserved.includes(o.status))
      .reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
  },

  // Gateway 1: Check stock availability
  async validateStock(productId, quantity) {
    if (USE_REAL_BACKEND) {
      return request('/orders/validate-stock', { method: 'POST', body: JSON.stringify({ productId, quantity }) });
    }

    const product = await productService.getProductById(productId);
    const reserved = await this.getReservedQty(productId);
    const available = Math.max(0, (product.stock || 0) - reserved);
    const isSufficient = available >= quantity;

    return {
      isSufficient,
      physicalStock: product.stock,
      reservedStock: reserved,
      availableStock: available,
      requestedQty: quantity,
      shortage: isSufficient ? 0 : quantity - available,
    };
  },

  // Create Order & Execute Gateway 1
  async createOrder({ customerName, customerPhone, customerAddress, productId, quantity, notes, draftInvoiceNo }) {
    if (USE_REAL_BACKEND) {
      return request('/orders', {
        method: 'POST',
        body: JSON.stringify({ customerName, customerPhone, customerAddress, productId, quantity, notes, draftInvoiceNo }),
      });
    }

    await delay(350);
    const product = await productService.getProductById(productId);
    const stockValidation = await this.validateStock(productId, quantity);

    const orders = getLocalOrders();
    const randCode = Math.floor(100 + Math.random() * 900);
    const newOrderId = `ORD-${new Date().getFullYear()}-${randCode}`;
    const totalAmount = (product.price || 0) * quantity;
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

    // GATEWAY 1: Apakah stok mencukupi?
    if (!stockValidation.isSufficient) {
      // TIDAK: Muncul Insufficient Stock Notification & batalkan pesanan
      const cancelledOrder = {
        id: newOrderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress || '-',
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalAmount,
        status: ORDER_STATUS.DIBATALKAN,
        stockReserved: false,
        cancellationReason: `Stok tidak mencukupi (Tersedia: ${stockValidation.availableStock}, Diminta: ${quantity})`,
        paymentProofUrl: null,
        transferAmount: null,
        transferBank: null,
        date: nowStr,
        createdAt: new Date().toISOString(),
        notes: notes || '',
        draftInvoiceNo,
      };

      saveLocalOrders([cancelledOrder, ...orders]);
      if (draftInvoiceNo) this.deleteDraftInvoice(draftInvoiceNo);

      // Kirim notifikasi stok tidak cukup ke Sales Admin
      notificationService.sendNotification({
        roleTarget: 'SALES_ADMIN',
        title: 'Validasi Stok Gagal: ' + product.name,
        message: `Pesanan ${customerName} dibatalkan otomatis karena stok kurang ${stockValidation.shortage} unit.`,
        type: 'WARNING',
        link: '/sales/orders',
      });

      return {
        success: false,
        isInsufficientStock: true,
        order: cancelledOrder,
        stockValidation,
      };
    }

    // YA: Reservasi Stok & Kirimkan QR Code Pembayaran (Menunggu Pembayaran)
    const newOrder = {
      id: newOrderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress || '-',
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalAmount,
      status: ORDER_STATUS.MENUNGGU_PEMBAYARAN,
      stockReserved: true, // Reservasi stok aktif
      qrisSent: true,
      qrisSentAt: nowStr,
      paymentProofUrl: null,
      transferAmount: null,
      transferBank: null,
      date: nowStr,
      createdAt: new Date().toISOString(),
      notes: notes || '',
      draftInvoiceNo,
    };

    saveLocalOrders([newOrder, ...orders]);
    if (draftInvoiceNo) this.deleteDraftInvoice(draftInvoiceNo);

    // Record Stock Movement: Reservasi Pesanan
    inventoryService.recordMovement({
      productId: product.id,
      type: 'OUT',
      category: 'Reservasi Pesanan',
      quantity: -quantity,
      reference: newOrderId,
      operator: 'Sales Admin',
      note: `Reservasi kuantitas ${quantity} unit untuk pesanan ${newOrderId}`,
    });

    return {
      success: true,
      isInsufficientStock: false,
      order: newOrder,
      stockValidation,
    };
  },

  async submitPaymentProof(orderId, { proofImageUrl, transferAmount, transferBank, customerNote }) {
    if (USE_REAL_BACKEND) {
      return request(`/orders/${orderId}/payment-proof`, {
        method: 'POST',
        body: JSON.stringify({ proofImageUrl, transferAmount, transferBank, customerNote }),
      });
    }

    await delay(300);
    const orders = getLocalOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan.');

    order.paymentProofUrl = proofImageUrl || '/images/receipt-sample.svg';
    order.transferAmount = Number(transferAmount) || order.totalAmount;
    order.transferBank = transferBank || 'QRIS Domestik';
    order.notes = customerNote ? `${order.notes || ''} | Bukti: ${customerNote}` : order.notes;

    saveLocalOrders(orders);

    notificationService.sendNotification({
      roleTarget: 'SALES_ADMIN',
      title: 'Bukti Pembayaran Diterima',
      message: `${order.customerName} telah mengirim bukti transfer untuk pesanan ${order.id}. Segera verifikasi.`,
      type: 'INFO',
      link: '/sales/orders',
    });

    return order;
  },

  // Gateway 2: Verifikasi Nominal Pembayaran
  async verifyPayment(orderId, { isNominalCorrect, notes }) {
    if (USE_REAL_BACKEND) {
      return request(`/orders/${orderId}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ isNominalCorrect, notes }),
      });
    }

    await delay(350);
    const orders = getLocalOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan.');

    // TIDAK SESUAI: Minta Transfer Ulang
    if (!isNominalCorrect) {
      order.status = ORDER_STATUS.PERLU_TRANSFER_ULANG;
      order.retransferReason = notes || 'Nominal transfer tidak sesuai dengan tagihan resmi.';
      saveLocalOrders(orders);

      return {
        success: false,
        retransferRequested: true,
        order,
      };
    }

    // SESUAI: Konfirmasi Pembayaran (Confirm Order)
    order.status = ORDER_STATUS.DIKONFIRMASI;
    order.stockReserved = false;
    order.confirmedAt = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    saveLocalOrders(orders);

    // 1. Sistem otomatis mengurangi stok fisik toko
    const product = await productService.getProductById(order.productId);
    const newStock = Math.max(0, (product.stock || 0) - order.quantity);
    await productService.updateProduct(order.productId, { stock: newStock });

    // 2. Catat Mutasi (Barang Keluar) Stok Manual / Stock Movement
    await inventoryService.recordMovement({
      productId: order.productId,
      type: 'OUT',
      category: 'Pengurangan Otomatis dari Pesanan',
      quantity: -order.quantity,
      remainingStock: newStock,
      reference: order.id,
      operator: 'Sistem FarmSight (Confirm Order)',
      note: `Pengurangan stok fisik pesanan ${order.id} lunas`,
    });

    // 3. Pengecekan Reorder Point (Gateway ROP)
    const rop = product.reorderPoint || product.minStock || 15;
    const isBelowRop = newStock <= rop;
    if (isBelowRop) {
      notificationService.sendNotification({
        roleTarget: 'STOCK_MANAGER',
        title: 'Alert Restock: ' + product.name,
        message: `Sisa stok ${product.name} kini ${newStock} unit (≤ ROP ${rop}). Segera lakukan pemesanan restock.`,
        type: 'WARNING',
        link: '/inventory/restock',
      });
    }

    return {
      success: true,
      order,
      newStock,
      isBelowRop,
    };
  },

  async cancelOrder(orderId, reason) {
    if (USE_REAL_BACKEND) return request(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });

    await delay(200);
    const orders = getLocalOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan.');

    order.status = ORDER_STATUS.DIBATALKAN;
    order.stockReserved = false;
    order.cancellationReason = reason || 'Dibatalkan oleh Sales Admin';
    saveLocalOrders(orders);

    return order;
  },

  generateCustomerQrisWhatsAppUrl(order) {
    const phone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const validPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const text = [
      `Halo Kak ${order.customerName},`,
      `Terima kasih telah memesan di ${OFFICIAL_STORE_INFO.name}!`,
      '',
      `Pesanan Anda telah kami validasi dan stok fisik telah direservasi:`,
      `• No. Pesanan: ${order.id}`,
      `• Produk: ${order.productName} (${order.quantity} unit)`,
      `• Total Tagihan Resmi: Rp ${order.totalAmount?.toLocaleString('id-ID')}`,
      '',
      `💳 METODE PEMBAYARAN RESMI (QRIS TOKO FARM BERKAH):`,
      `• QRIS NMID: ${OFFICIAL_STORE_INFO.qrisNmid}`,
      `• Atas Nama: ${OFFICIAL_STORE_INFO.qrisMerchantName}`,
      `• Nominal Transfer: Rp ${order.totalAmount?.toLocaleString('id-ID')}`,
      '',
      `Silakan transfer sesuai nominal, lalu balas pesan ini dengan melampirkan foto bukti struk transfer Anda agar segera diverifikasi oleh Sales Admin kami. Terima kasih! 🙏`,
    ].join('\n');

    return `https://api.whatsapp.com/send?phone=${validPhone}&text=${encodeURIComponent(text)}`;
  },

  generateReTransferWhatsAppUrl(order) {
    const phone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const validPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const text = [
      `Halo Kak ${order.customerName},`,
      `Mengenai pembayaran untuk pesanan ${order.id}:`,
      '',
      `⚠️ ${order.retransferReason || 'Nominal transfer belum sesuai dengan total tagihan resmi.'}`,
      `• Total Tagihan Resmi: Rp ${order.totalAmount?.toLocaleString('id-ID')}`,
      '',
      `Mohon lakukan transfer ulang atau transfer kekurangannya sesuai nominal yang ditentukan ke QRIS Toko Farm Berkah (NMID: ${OFFICIAL_STORE_INFO.qrisNmid}) dan kirimkan kembali bukti transfernya ke chat WhatsApp ini. Terima kasih! 🙏`,
    ].join('\n');

    return `https://api.whatsapp.com/send?phone=${validPhone}&text=${encodeURIComponent(text)}`;
  },
};

