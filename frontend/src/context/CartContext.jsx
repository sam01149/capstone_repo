import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatRupiah } from '../utils/formatters';
import { orderService } from '../services/orderService';
import { OFFICIAL_STORE_INFO } from '../mocks/ordersAndInventoryData';

const CartContext = createContext(null);

const STORAGE_CART = 'farmsight_guest_cart_v1';

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    if (!product || product.stock <= 0) return false;
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx !== -1) {
        const next = [...prev];
        const newQty = Math.min(product.stock, next[idx].quantity + quantity);
        next[idx] = { ...next[idx], quantity: newQty, subtotal: newQty * product.price };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          unit: product.unit,
          image: product.image,
          quantity: Math.min(product.stock, quantity),
          subtotal: Math.min(product.stock, quantity) * product.price,
          availableStock: product.stock,
        },
      ];
    });
    return true;
  };

  const updateQuantity = (productId, qty) => {
    setCartItems((prev) => {
      if (qty <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((item) => {
        if (item.productId === productId) {
          const validQty = Math.min(item.availableStock, qty);
          return { ...item, quantity: validQty, subtotal: validQty * item.price };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCartItems([]);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Generate and Download Draft Invoice (.txt)
  const downloadDraftInvoice = (customerData, draftInvoiceNo) => {
    const now = new Date();
    const dateFormatted = now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    const invoiceLines = [
      '======================================================================',
      '                    UMKM TOKO FARM BERKAH - PULO GEBANG',
      '                     RINGKASAN PEMESANAN / DRAFT INVOICE',
      '======================================================================',
      `No. Dokumen     : ${draftInvoiceNo}`,
      `Tanggal Dokumen : ${dateFormatted}`,
      `Status Dokumen  : DRAFT RESMI PEMESANAN`,
      '----------------------------------------------------------------------',
      'DATA PEMESAN (PELANGGAN):',
      `• Nama Lengkap  : ${customerData.name}`,
      `• No. WhatsApp  : ${customerData.phone}`,
      `• Alamat Kirim  : ${customerData.address}`,
      '----------------------------------------------------------------------',
      'RINCIAN PRODUK PESANAN:',
      ...cartItems.map(
        (i, idx) =>
          `${idx + 1}. ${i.productName} (${i.quantity} ${i.unit}) @ ${formatRupiah(i.price)} = ${formatRupiah(i.subtotal)}`
      ),
      '----------------------------------------------------------------------',
      `ESTIMASI TOTAL PEMBAYARAN : ${formatRupiah(totalAmount)}`,
      '======================================================================',
      'CATATAN RESMI:',
      '* Harga bersifat estimasi, konfirmasi stok dan QRIS diterbitkan oleh Sales Admin.',
      '* Mohon kirimkan ringkasan ini ke nomor WhatsApp resmi kami.',
      '',
      `Alamat Toko: ${OFFICIAL_STORE_INFO.address}`,
      `WhatsApp Resmi: ${OFFICIAL_STORE_INFO.phone} | Email: ${OFFICIAL_STORE_INFO.email}`,
      '======================================================================',
    ];

    const blob = new Blob([invoiceLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Draft-Invoice-${draftInvoiceNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Kirim Ringkasan via WhatsApp
  const sendViaWhatsApp = async (customerData) => {
    if (cartItems.length === 0) return;

    const now = new Date();
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const draftInvoiceNo = `DRAFT-INV-${dateCode}-${randCode}`;

    // Auto-save draft for Sales Admin Inbox
    for (const item of cartItems) {
      await orderService.saveDraftInvoice({
        invoiceNo: draftInvoiceNo,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerAddress: customerData.address,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.subtotal,
        date: now.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        messageSnippet: `Pesanan ${item.productName} (${item.quantity} unit) dari ${customerData.name}`,
      });
    }

    const itemsText = cartItems
      .map((i, idx) => `  ${idx + 1}. ${i.productName} (${i.quantity} ${i.unit}) - ${formatRupiah(i.subtotal)}`)
      .join('\n');

    const messageLines = [
      `*PEMESANAN PRODUK - ${OFFICIAL_STORE_INFO.name.toUpperCase()}*`,
      '----------------------------------------------',
      `📄 *No. Draft:* ${draftInvoiceNo}`,
      `👤 *Nama:* ${customerData.name}`,
      `📱 *No. WhatsApp:* ${customerData.phone}`,
      `📍 *Alamat Kirim:* ${customerData.address}`,
      '',
      '*📦 Rincian Item Pesanan:*',
      itemsText,
      '----------------------------------------------',
      `💰 *Estimasi Total:* *${formatRupiah(totalAmount)}*`,
      '',
      'Halo Sales Admin Farm Berkah, saya ingin memesan produk di atas. Mohon konfirmasi ketersediaan stok dan nomor QRIS resmi tokonya ya kak. Terima kasih! 🙏',
    ];

    const message = messageLines.join('\n');
    const waUrl = `https://api.whatsapp.com/send?phone=${OFFICIAL_STORE_INFO.phoneRaw}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    return draftInvoiceNo;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalAmount,
        totalItemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        downloadDraftInvoice,
        sendViaWhatsApp,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      cartItems: [],
      totalAmount: 0,
      totalItemCount: 0,
      addToCart: () => false,
      updateQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      downloadDraftInvoice: () => {},
      sendViaWhatsApp: async () => '',
    };
  }
  return ctx;
}

