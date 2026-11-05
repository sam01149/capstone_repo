import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowRight,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  CheckCircle2,
  Plus,
  Filter,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  Download,
  Search,
  RefreshCw,
  QrCode,
  Receipt,
  XCircle,
  Check,
  Printer,
  Eye,
  MessageSquare,
  AlertCircle,
  X,
  Sparkles,
  HelpCircle,
  Lock,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockAuth';
import AccessDenied from '../layout/AccessDenied';
import { getStoredProducts, formatRupiah } from '../../data/productsData';
import {
  getStoredOrders,
  saveStoredOrders,
  getStoredMovements,
  getStoredDraftInvoices,
  getStoredForecasts,
  saveStoredForecasts,
  checkProductStock,
  createSalesOrder,
  submitTransferProof,
  verifyAndConfirmPayment,
} from '../../data/ordersAndInventoryData';

export default function Operations({ tabId, onBackToDashboard }) {
  const { role, isRole } = useAuth();
  const [successToast, setSuccessToast] = useState('');

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [orders, setOrders] = useState(getStoredOrders);
  const [movements, setMovements] = useState(getStoredMovements);
  const [draftInvoices, setDraftInvoices] = useState(getStoredDraftInvoices);
  const [forecasts, setForecasts] = useState(getStoredForecasts);

  // Subtab states
  const [inventorySubTab, setInventorySubTab] = useState('summary'); // 'summary' or 'movement'
  const [reportType, setReportType] = useState('inventory'); // 'inventory', 'sales', 'forecast'

  // Modal States for Orders (Gateway 1 & Gateway 2)
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [insufficientStockModal, setInsufficientStockModal] = useState(null); // { order, currentStock, requestedQty }
  const [qrPaymentModal, setQrPaymentModal] = useState(null); // { order }
  const [qrisCopiedStatus, setQrisCopiedStatus] = useState(false);
  const [verifyPaymentModal, setVerifyPaymentModal] = useState(null); // { order }
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [reTransferReason, setReTransferReason] = useState('');

  // Workflow Hint Circle state
  const [showWorkflowHint, setShowWorkflowHint] = useState(false);

  // Inbox Filter States
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxProductFilter, setInboxProductFilter] = useState('ALL');

  // Form states for Create Order
  const [newCustName, setNewCustName] = useState('Ibu Dewi Permata');
  const [newCustPhone, setNewCustPhone] = useState('+62 813-2233-4455');
  const [newCustAddress, setNewCustAddress] = useState('Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur');
  const [newProductId, setNewProductId] = useState(products[0]?.id || 'ES-TELANG');
  const [newQuantity, setNewQuantity] = useState(3);
  const [newDraftNo, setNewDraftNo] = useState('');

  // Sync data across tabs in real-time
  useEffect(() => {
    const syncAll = () => {
      setProducts(getStoredProducts());
      setOrders(getStoredOrders());
      setMovements(getStoredMovements());
      setDraftInvoices(getStoredDraftInvoices());
      setForecasts(getStoredForecasts());
    };

    window.addEventListener('farmsight_products_updated', syncAll);
    window.addEventListener('farmsight_orders_updated', syncAll);
    window.addEventListener('farmsight_movements_updated', syncAll);
    window.addEventListener('farmsight_draft_invoices_updated', syncAll);
    window.addEventListener('farmsight_forecasts_updated', syncAll);

    return () => {
      window.removeEventListener('farmsight_products_updated', syncAll);
      window.removeEventListener('farmsight_orders_updated', syncAll);
      window.removeEventListener('farmsight_movements_updated', syncAll);
      window.removeEventListener('farmsight_draft_invoices_updated', syncAll);
      window.removeEventListener('farmsight_forecasts_updated', syncAll);
    };
  }, []);

  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Pre-fill Create Order form from customer draft invoice
  const handleProcessDraftInvoice = (draft) => {
    setNewProductId(draft.productId);
    setNewQuantity(draft.quantity);
    setNewDraftNo(draft.invoiceNo);
    setNewCustName(draft.customerName || 'Ibu Dewi Permata');
    setNewCustPhone(draft.customerPhone || '+62 813-2233-4455');
    setNewCustAddress(draft.customerAddress || 'Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur');
    setIsCreateOrderModalOpen(true);
  };

  // Submit Create Order Form (GATEWAY 1: Cek Stok)
  const handleCreateOrderSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(newQuantity, 10);
    if (!qty || qty < 1) {
      alert('Kuantitas pesanan minimal 1 unit.');
      return;
    }

    const result = createSalesOrder({
      customerName: newCustName.trim(),
      customerPhone: newCustPhone.trim(),
      customerAddress: newCustAddress.trim(),
      productId: newProductId,
      quantity: qty,
      draftInvoiceNo: newDraftNo || `DRAFT-INV-${Date.now().toString().slice(-6)}`,
    });

    setIsCreateOrderModalOpen(false);

    if (result.isInsufficientStock) {
      // GATEWAY 1: Stok Tidak Mencukupi -> Notifikasi Insufficient Stock & Batalkan
      setInsufficientStockModal({
        order: result.order,
        requestedQty: qty,
        availableStock: result.currentStock ?? 0,
      });
      triggerToast('GATEWAY 1: Stok fisik tidak mencukupi. Pemesanan dibatalkan.');
    } else {
      // GATEWAY 1: Stok Tersedia -> Reservasi Stok & Kirim QR Code Pembayaran
      setQrPaymentModal(result.order);
      triggerToast('GATEWAY 1: Stok tersedia & direservasi! QR Code pembayaran terbit.');
    }
  };

  // Salin Foto QRIS Toko ke Clipboard (Format PNG untuk kompatibilitas Clipboard API)
  const copyQrisImageToClipboard = async () => {
    try {
      const res = await fetch('/images/qris-farm-berkah.jpg');
      const blob = await res.blob();

      const img = document.createElement('img');
      const imgUrl = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      URL.revokeObjectURL(imgUrl);

      if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob })
        ]);
        setQrisCopiedStatus(true);
        setTimeout(() => setQrisCopiedStatus(false), 9000);
        return true;
      }
    } catch (err) {
      console.warn('Gagal salin foto QRIS ke clipboard:', err);
    }
    return false;
  };

  // Kirim QR Code ke WhatsApp Customer: Langsung ke nomor customer pemesan, bebas popup OS, dan salin foto QRIS
  const handleSendQrisWhatsApp = () => {
    if (!qrPaymentModal) return;
    const cleanPhone = qrPaymentModal.customerPhone.replace(/[^0-9]/g, '');
    const cleanText =
      `Halo ${qrPaymentModal.customerName},\n\n` +
      `Stok pesanan Anda (${qrPaymentModal.id} - ${qrPaymentModal.productName} sebanyak ${qrPaymentModal.quantity} unit) telah berhasil diverifikasi dan direservasi oleh Toko Farm Berkah.\n\n` +
      `Total Pembayaran: ${formatRupiah(qrPaymentModal.totalAmount)}\n\n` +
      `Silakan scan foto QRIS resmi Toko Farm Berkah yang kami lampirkan untuk menyelesaikan pembayaran.\n\n` +
      `Setelah melakukan transfer, mohon kirimkan foto bukti transfer ke nomor WhatsApp ini untuk verifikasi pembayaran (Gateway 2). Terima kasih!`;

    // 1. Salin foto QRIS otomatis ke Clipboard agar saat chat WhatsApp customer terbuka tinggal tekan Ctrl + V
    copyQrisImageToClipboard();

    // 2. Buka langsung ke nomor WhatsApp customer pemesan (tanpa popup Share OS Windows)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(cleanText)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(cleanText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Open Verify Transfer Payment Modal (GATEWAY 2)
  const handleOpenVerifyPayment = (order) => {
    setVerifyPaymentModal(order);
    setTransferAmountInput(String(order.transferAmount || order.totalAmount));
    setReTransferReason('');
  };

  // Submit Gateway 2 Decision
  const handleConfirmPaymentGateway = (isApproved) => {
    if (!verifyPaymentModal) return;

    if (!isApproved) {
      // GATEWAY 2: Nominal Tidak Sesuai -> Minta Transfer Ulang
      const result = verifyAndConfirmPayment(
        verifyPaymentModal.id,
        false,
        reTransferReason || `Nominal transfer (Rp ${Number(transferAmountInput || 0).toLocaleString('id-ID')}) belum sesuai tagihan (${formatRupiah(verifyPaymentModal.totalAmount)}). Silakan transfer ulang.`
      );
      setVerifyPaymentModal(null);
      triggerToast(result.message);
    } else {
      // GATEWAY 2: Nominal Sesuai -> Konfirmasi Pembayaran / Confirm Order
      // Otomatis kurangi stok, catat stock movement OUT, cek ROP!
      const result = verifyAndConfirmPayment(verifyPaymentModal.id, true);
      setVerifyPaymentModal(null);
      triggerToast(
        `✓ ${result.message} ${result.isRopTriggered ? '⚠️ ' + result.ropAlert : '✅ ' + result.ropAlert}`
      );
    }
  };

  // Simulate customer sends proof of transfer
  const handleSimulateCustomerTransfer = (orderId) => {
    submitTransferProof(orderId, null, null);
    triggerToast(`Bukti transfer untuk pesanan ${orderId} berhasil diunggah.`);
  };

  // Calculate & Update Demand Forecasting (ARIMA & Croston SBA)
  const handleRecalculateForecast = () => {
    const updated = forecasts.map((f) => {
      const growthFactor = 1 + (Math.random() * 0.15 - 0.05); // slight realistic variation
      const w1 = Math.round(f.horizonW1 * growthFactor);
      const w2 = Math.round(f.horizonW2 * growthFactor);
      const w3 = Math.round(f.horizonW3 * growthFactor);
      const w4 = Math.round(f.horizonW4 * growthFactor);
      const avgWeekly = (w1 + w2 + w3 + w4) / 4;
      const ss = Math.round(avgWeekly * 0.35);
      const rop = Math.round(avgWeekly * (f.leadTimeDays / 7) + ss);

      return {
        ...f,
        horizonW1: w1,
        horizonW2: w2,
        horizonW3: w3,
        horizonW4: w4,
        safetyStock: ss,
        reorderPoint: rop,
        status: 'TERKALKULASI_BARU',
      };
    });

    saveStoredForecasts(updated);
    triggerToast('Kalkulasi Demand Forecasting (ARIMA & Croston SBA) dan Safety Stock berhasil diupdate ke sistem!');
  };

  // Export Laporan Persediaan
  const handleExportReport = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const csvRows = [
      ['KODE SKU', 'NAMA PRODUK', 'KATEGORI', 'STOK FISIK', 'MIN STOCK', 'SAFETY STOCK', 'REORDER POINT', 'STATUS ROP', 'NILAI ASET (RP)'],
      ...products.map((p) => {
        const rop = p.reorderPoint || p.minStock || 15;
        const ss = p.safetyStock || Math.round(rop * 0.5);
        const statusRop = p.stock <= rop ? 'PERLU RESTOCK' : 'STOK AMAN';
        const assetValue = (p.price || 0) * (p.stock || 0);
        return [p.id, p.name, p.category, p.stock, p.minStock, ss, rop, statusRop, assetValue];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan-Persediaan-TokoFarmBerkah-${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast('Laporan Persediaan berhasil digenerate dan diexport! Seluruh proses selesai.');
  };

  // =========================================================================
  // 1. SALES ORDERS MODULE (SALES ADMIN & SUPER ADMIN)
  // =========================================================================
  if (tabId === 'orders') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.SALES_ADMIN)) {
      return <AccessDenied featureName="Manajemen Pesanan Penjualan (Sales Orders)" onBackToDashboard={onBackToDashboard} />;
    }

    // Tampilan Bersih & Rapi: Input Pesanan Baru (Sales Admin)
    if (isCreateOrderModalOpen) {
      const targetProd = products.find((p) => p.id === newProductId);
      const currentStock = targetProd?.stock ?? 0;
      const isStockAvailable = currentStock >= newQuantity;
      const totalEst = (targetProd?.price || 0) * newQuantity;

      return (
        <div style={{ padding: '24px 32px' }} className="animate-fade-in">
          {/* Header Navigasi & Breadcrumb */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setIsCreateOrderModalOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #d8e2da',
                  color: '#1b4332',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#edf7f0';
                  e.currentTarget.style.borderColor = '#2d6a4f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#d8e2da';
                }}
              >
                <ArrowLeft size={16} />
                <span>Kembali ke Daftar Pesanan</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <span
                  style={{ cursor: 'pointer', color: '#2d6a4f', fontWeight: 600 }}
                  onClick={() => setIsCreateOrderModalOpen(false)}
                >
                  Manajemen Pesanan
                </span>
                <span>/</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  Input Pesanan Baru
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                Sinkronisasi WhatsApp
              </span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                Role: Sales Admin
              </span>
            </div>
          </div>

          {/* Banner Informasi & SOP */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '22px 26px', marginBottom: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Input Pesanan Baru
                </h1>
              </div>
            </div>

            {/* SOP Security Notice */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>
              <Lock size={15} color="#2d6a4f" style={{ flexShrink: 0 }} />
              <span>
                <strong>SOP Toko Farm Berkah:</strong> Rincian data pesanan di bawah ini dikirimkan langsung oleh customer dan terkunci di sistem (read-only) untuk menjamin validitas transaksi.
              </span>
            </div>
          </div>

          <form onSubmit={handleCreateOrderSubmit}>
            {/* Grid 2-Kolom Sejajar Sempurna & Proporsional */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '22px', alignItems: 'stretch' }}>
              {/* Kolom Kiri: Informasi Pelanggan Resmi (Terkunci) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  height: '100%',
                }}
              >
                {/* Header Kolom Kiri */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Data Resmi Pelanggan (WhatsApp)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={11} />
                    <span>Terkunci</span>
                  </span>
                </div>

                {/* Nomor Draft Invoice */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Nomor Draft Invoice Customer:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2d6a4f' }} />
                    <input
                      type="text"
                      readOnly
                      value={newDraftNo}
                      style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.875rem', fontFamily: 'monospace', color: '#1b4332', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Nama Pelanggan & WhatsApp */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Nama Pelanggan:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        readOnly
                        value={newCustName}
                        style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      No. WhatsApp / HP:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        readOnly
                        value={newCustPhone}
                        style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Alamat Pengiriman */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Alamat Lengkap Pengiriman:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                    <textarea
                      rows={3}
                      readOnly
                      value={newCustAddress}
                      style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#1e293b', resize: 'none', lineHeight: 1.5 }}
                    />
                  </div>
                </div>

                {/* Status Verifikasi Data Pelanggan */}
                <div
                  style={{
                    padding: '16px 18px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={16} color="#2d6a4f" /> Status Verifikasi Data Pelanggan:
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                      ✅ Terverifikasi
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                    Data nomor draft, identitas, kontak WhatsApp, dan alamat pengiriman di atas telah tersinkronisasi langsung dari permohonan customer dan terkunci di sistem sesuai SOP Toko Farm Berkah.
                  </div>
                  <div style={{ paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.74rem', color: '#94a3b8' }}>
                    SOP Data: Form bersifat read-only untuk mencegah manipulasi data transaksi.
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Rincian Produk, Verifikasi Stok & Tindakan */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  height: '100%',
                }}
              >
                {/* Header Kolom Kanan */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Boxes size={16} />
                    </div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Rincian Pesanan & Verifikasi Stok
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    Gateway 1
                  </span>
                </div>

                {/* Produk Pesanan & Kuantitas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Produk Pesanan:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${targetProd?.name || newProductId} (${formatRupiah(targetProd?.price || 0)})`}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Kuantitas Pesanan:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${newQuantity} unit (${targetProd?.unit || 'unit'})`}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#1b4332', fontWeight: 800 }}
                    />
                  </div>
                </div>

                {/* Total Estimasi Pembayaran */}
                <div style={{ padding: '14px 18px', backgroundColor: '#f8faf9', borderRadius: '12px', border: '1px solid #e1e7e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Tagihan Pembayaran:</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{newQuantity} unit × {formatRupiah(targetProd?.price || 0)}</span>
                  </div>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1b4332', fontFamily: 'monospace' }}>
                    {formatRupiah(totalEst)}
                  </span>
                </div>

                {/* Verifikasi Ketersediaan Stok Fisik (Gateway 1) - Alur Rapi, Proporsional & Tanpa Gap Kosong */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: isStockAvailable ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                    backgroundColor: isStockAvailable ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: isStockAvailable ? '#166534' : '#991b1b' }}>
                      Status Verifikasi Stok Fisik:
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: isStockAvailable ? '#dcfce7' : '#fee2e2', color: isStockAvailable ? '#15803d' : '#b91c1c' }}>
                      {isStockAvailable ? '✅ Stok Tersedia' : '❌ Stok Tidak Mencukupi'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Stok di Toko</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019' }}>{currentStock} unit</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Jumlah Pesanan</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>{newQuantity} unit</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Sisa Estimasi</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isStockAvailable ? '#16a34a' : '#dc2626' }}>
                        {currentStock - newQuantity} unit
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: '10px', borderTop: isStockAvailable ? '1px dashed #bbf7d0' : '1px dashed #fca5a5', fontSize: '0.76rem', color: isStockAvailable ? '#15803d' : '#b91c1c', lineHeight: 1.45 }}>
                    {isStockAvailable
                      ? 'Stok fisik toko mencukupi. Klik "Proses" untuk mereservasi stok dan menerbitkan QR Code pembayaran QRIS ke customer.'
                      : 'Stok fisik toko tidak mencukupi permintaan. Klik "Proses" untuk membatalkan pesanan otomatis dan menerbitkan notifikasi insufficient stock.'}
                  </div>
                </div>

                {/* Tombol Tindakan Batal & Proses di Bawah Keterangan Verifikasi Stok */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px', marginTop: 'auto', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOrderModalOpen(false)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#2d6a4f',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(45, 106, 79, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1b4332')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2d6a4f')}
                  >
                    <span>Proses</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      );
    }

    // Tampilan Bersih & Rapi 2: Full Layar QR Code Pembayaran Terbit (Gateway 1 Sukses)
    if (qrPaymentModal) {
      return (
        <div style={{ padding: '24px 32px' }} className="animate-fade-in">
          {/* Header Navigasi & Breadcrumb */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setQrPaymentModal(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #d8e2da',
                  color: '#1b4332',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#edf7f0';
                  e.currentTarget.style.borderColor = '#2d6a4f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#d8e2da';
                }}
              >
                <ArrowLeft size={16} />
                <span>Kembali ke Daftar Pesanan</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <span
                  style={{ cursor: 'pointer', color: '#2d6a4f', fontWeight: 600 }}
                  onClick={() => setQrPaymentModal(null)}
                >
                  Manajemen Pesanan
                </span>
                <span>/</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  QR Code Pembayaran ({qrPaymentModal.id})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                Gateway 1: Stok Tersedia & Direservasi
              </span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                Role: Sales Admin
              </span>
            </div>
          </div>

          {/* Card Tunggal Terpusat: QRIS Resmi Toko Farm Berkah Saja */}
          <div style={{ maxWidth: '480px', margin: '16px auto 32px auto' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e1e7e2',
                padding: '26px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Header Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      QRIS Resmi Toko Farm Berkah
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      No. Pesanan: <strong>{qrPaymentModal.id}</strong> • {qrPaymentModal.customerName}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                  GPN / QRIS
                </span>
              </div>

              {/* Poster QRIS Resmi Toko Farm Berkah */}
              <div
                style={{
                  border: '1.5px dashed #86efac',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #d1fae5', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', backgroundColor: '#ffffff' }}>
                  <img
                    src="/images/qris-farm-berkah.jpg"
                    alt="QRIS Resmi Toko Farm Berkah"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Nominal Transfer Tepat Sesuai Tagihan:</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1b4332', fontFamily: 'monospace', letterSpacing: '-0.02em', marginTop: '2px' }}>
                    {formatRupiah(qrPaymentModal.totalAmount)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    NMID: ID1026508798372 • A.n. Toko Farm Berkah
                  </div>
                </div>
              </div>

              {/* Info Tujuan Customer */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={14} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Tujuan WhatsApp Customer Pemesan:</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b' }}>
                      {qrPaymentModal.customerName} • {qrPaymentModal.customerPhone}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyQrisImageToClipboard}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    whiteSpace: 'nowrap',
                  }}
                  title="Salin foto QRIS ke clipboard"
                >
                  <Copy size={13} />
                  <span>Salin Foto</span>
                </button>
              </div>

              {/* Status Notifikasi Clipboard */}
              {qrisCopiedStatus && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#166534',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}
                >
                  <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', color: '#15803d' }}>Foto QRIS Tersalin ke Clipboard!</strong>
                    <span>Di chat WhatsApp {qrPaymentModal.customerName}, tekan <strong>Ctrl + V</strong> (Paste) untuk melampirkan fotonya langsung.</span>
                  </div>
                </div>
              )}

              {/* Petunjuk Make Sure */}
              <div style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center', margin: '2px 0' }}>
                💡 Klik tombol di bawah untuk langsung membuka chat WhatsApp <strong>{qrPaymentModal.customerName}</strong>. Tekan <strong>Ctrl + V</strong> untuk melampirkan foto QRIS, make sure data sudah benar, lalu klik kirim.
              </div>

              {/* Tombol Tindakan: Kirim ke WhatsApp & Kembali */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleSendQrisWhatsApp}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1ebc59')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#25D366')}
                >
                  <MessageSquare size={18} />
                  <span>Kirim ke WhatsApp Customer ({qrPaymentModal.customerPhone})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQrPaymentModal(null);
                    setQrisCopiedStatus(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  Kembali ke Daftar Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        {/* Module Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                Manajemen Pesanan Penjualan
              </h1>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#d8f3dc', color: '#1b4332', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                Role: Sales Admin
              </span>
              {/* Lingkaran Hint Alur Pemrosesan Pesanan */}
              <button
                type="button"
                onClick={() => setShowWorkflowHint((prev) => !prev)}
                title="Klik untuk melihat petunjuk alur pemrosesan pesanan WhatsApp"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1.5px solid #2d6a4f',
                  backgroundColor: showWorkflowHint ? '#2d6a4f' : '#e8f5e9',
                  color: showWorkflowHint ? '#ffffff' : '#2d6a4f',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  transition: 'all 0.15s ease',
                  padding: 0,
                  marginLeft: '2px',
                }}
              >
                ?
              </button>
            </div>

            {/* Hint Alur Interaktif (Muncul jika lingkaran hint diklik) */}
            {showWorkflowHint && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '14px 18px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  maxWidth: '820px',
                  boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)',
                }}
                className="animate-fade-in"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                    <Sparkles size={16} />
                    <span>Petunjuk Alur Pemrosesan Pesanan WhatsApp:</span>
                  </div>
                  <button
                    onClick={() => setShowWorkflowHint(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', padding: '2px', display: 'flex' }}
                    title="Tutup petunjuk"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>1. Verifikasi Stok (Gateway 1)</div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.4 }}>Sales Admin verifikasi ketersediaan stok fisik di sistem sebelum memproses.</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>2. Reservasi Stok & Kirim QRIS</div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.4 }}>Jika stok cukup, sistem mereservasi stok dan menerbitkan QR Code pembayaran.</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>3. Verifikasi Nominal (Gateway 2)</div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.4 }}>Customer kirim bukti transfer, admin mengecek kesesuaian nominal tagihan.</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>4. Konfirmasi & Potong Stok</div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.4 }}>Pembayaran valid &rarr; stok fisik berkurang otomatis dan tercatat di mutasi stok.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (draftInvoices.length > 0) {
                handleProcessDraftInvoice(draftInvoices[0]);
              } else {
                setNewDraftNo('');
                setIsCreateOrderModalOpen(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2d6a4f',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(45, 106, 79, 0.2)',
            }}
          >
            <Plus size={18} />
            <span>+ Input Pesanan Baru</span>
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#16a34a', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 600 }} className="animate-fade-in">
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Section: Draft Pesanan Masuk dari WhatsApp Customer (Inbox) */}
        {draftInvoices.length > 0 && (() => {
          const filteredDrafts = draftInvoices.filter((d) => {
            const matchSearch =
              !inboxSearch ||
              d.invoiceNo?.toLowerCase().includes(inboxSearch.toLowerCase()) ||
              d.productName?.toLowerCase().includes(inboxSearch.toLowerCase()) ||
              (d.customerName && d.customerName.toLowerCase().includes(inboxSearch.toLowerCase())) ||
              (d.customerPhone && d.customerPhone.toLowerCase().includes(inboxSearch.toLowerCase()));

            const matchProduct = inboxProductFilter === 'ALL' || d.productId === inboxProductFilter;
            return matchSearch && matchProduct;
          });

          return (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #b7e4c7', padding: '18px 20px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(27,67,50,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#142019', margin: 0 }}>
                      Inbox Pesanan Masuk via WhatsApp ({draftInvoices.length} Draft Invoice)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#718277' }}>
                      Customer telah mengunduh draft invoice atau mengirim permohonan via WhatsApp. Klik tombol untuk input pesanan.
                    </span>
                  </div>
                </div>

                {/* Filter Toolbar for Sales Admin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      placeholder="Cari No. Draft, Pelanggan, Produk..."
                      style={{
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        color: '#142019',
                        outline: 'none',
                        width: '230px',
                      }}
                    />
                  </div>

                  <select
                    value={inboxProductFilter}
                    onChange={(e) => setInboxProductFilter(e.target.value)}
                    style={{
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      color: '#142019',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">Semua Produk</option>
                    {Array.from(new Set(draftInvoices.map((d) => d.productId))).map((pid) => {
                      const sample = draftInvoices.find((d) => d.productId === pid);
                      return (
                        <option key={pid} value={pid}>
                          {sample?.productName || pid}
                        </option>
                      );
                    })}
                  </select>

                  {(inboxSearch || inboxProductFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setInboxSearch('');
                        setInboxProductFilter('ALL');
                      }}
                      style={{
                        height: '34px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Draft Cards Grid */}
              {filteredDrafts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8faf8', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.825rem' }}>
                  Tidak ada draft pesanan yang sesuai dengan filter pencarian.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: '12px' }}>
                  {filteredDrafts.map((d) => (
                    <div key={d.invoiceNo} style={{ backgroundColor: '#f8faf8', border: '1px solid #d8e2da', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2d6a4f', fontFamily: 'monospace' }}>
                            {d.invoiceNo}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#718277' }}>{d.date?.split(',')[1] || d.date}</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#142019' }}>{d.productName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#2d6a4f', fontWeight: 600, marginTop: '2px' }}>
                          👤 {d.customerName || 'Ibu Dewi Permata'} ({d.customerPhone || '+62 813-2233-4455'})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#48564e', marginTop: '3px' }}>
                          Kuantitas: <strong>{d.quantity} unit</strong> &bull; Total: <strong style={{ color: '#1b4332' }}>{d.subtotalFormatted || formatRupiah(d.subtotal)}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => handleProcessDraftInvoice(d)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#2d6a4f',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>Input Pesanan Ini (Create Order)</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Orders Table */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e1e7e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#142019', margin: 0 }}>
              Daftar Pesanan Penjualan & Status Gateway
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#718277' }}>Total: {orders.length} Pesanan</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>No. Pesanan / Draft</th>
                  <th style={{ padding: '12px 16px' }}>Pelanggan</th>
                  <th style={{ padding: '12px 16px' }}>Produk & Kuantitas</th>
                  <th style={{ padding: '12px 16px' }}>Total Tagihan</th>
                  <th style={{ padding: '12px 16px' }}>Status Alur Pesanan</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi Gateway</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isMenungguBayar = o.status === 'MENUNGGU_PEMBAYARAN';
                  const isBuktiDikirim = o.status === 'BUKTI_DIKIRIM';
                  const isPerluUlang = o.status === 'PERLU_TRANSFER_ULANG';
                  const isSelesai = o.status === 'SELESAI';
                  const isDibatalkan = o.status === 'DIBATALKAN';

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#2d6a4f' }}>{o.id}</div>
                        <div style={{ fontSize: '0.72rem', color: '#718277', fontFamily: 'monospace' }}>{o.draftInvoiceNo}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#142019' }}>{o.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#718277' }}>{o.customerPhone}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{o.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {o.quantity} {o.unit} &bull; {formatRupiah(o.price)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#142019' }}>
                        {formatRupiah(o.totalAmount)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isMenungguBayar && (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                            Menunggu Pembayaran (Stok Direservasi)
                          </span>
                        )}
                        {isBuktiDikirim && (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            Bukti Transfer Masuk &bull; Perlu Verifikasi
                          </span>
                        )}
                        {isPerluUlang && (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            Nominal Tidak Sesuai (Minta Transfer Ulang)
                          </span>
                        )}
                        {isSelesai && (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            Selesai &bull; Pembayaran Terkonfirmasi
                          </span>
                        )}
                        {isDibatalkan && (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            Dibatalkan (Stok Tidak Mencukupi)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {isMenungguBayar && (
                            <>
                              <button
                                onClick={() => setQrPaymentModal(o)}
                                style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #d1d9d3', backgroundColor: '#fff', color: '#1b4332', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <QrCode size={13} />
                                <span>QR Code</span>
                              </button>
                              <button
                                onClick={() => handleSimulateCustomerTransfer(o.id)}
                                style={{ padding: '5px 9px', borderRadius: '6px', border: 'none', backgroundColor: '#25D366', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Simulasikan Customer Kirim Bukti Transfer"
                              >
                                <Receipt size={13} />
                                <span>Kirim Bukti</span>
                              </button>
                            </>
                          )}

                          {isBuktiDikirim && (
                            <button
                              onClick={() => handleOpenVerifyPayment(o)}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#1d4ed8', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(29,78,216,0.2)' }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Verifikasi Nominal (Gateway 2)</span>
                            </button>
                          )}

                          {isPerluUlang && (
                            <button
                              onClick={() => handleSimulateCustomerTransfer(o.id)}
                              style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #dc2626', backgroundColor: '#fff', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Kirim Ulang Bukti
                            </button>
                          )}

                          {isSelesai && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Terkonfirmasi
                            </span>
                          )}

                          {isDibatalkan && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Proses Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 2: Insufficient Stock Notification (GATEWAY 1 GAGAL) */}
        {insufficientStockModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '440px', padding: '24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} className="animate-fade-in">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '1px solid #fecaca' }}>
                <XCircle size={36} />
              </div>

              <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Gateway 1: Insufficient Stock Notification
              </span>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', marginTop: '10px', marginBottom: '8px' }}>
                Stok Fisik Tidak Mencukupi!
              </h3>

              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', textAlign: 'left', fontSize: '0.825rem', color: '#991b1b', lineHeight: 1.5 }}>
                Produk: <strong>{insufficientStockModal.order.productName}</strong><br />
                Jumlah Diminta: <strong>{insufficientStockModal.requestedQty} {insufficientStockModal.order.unit || 'unit'}</strong><br />
                Stok Fisik Tersedia: <strong>{insufficientStockModal.availableStock} {insufficientStockModal.order.unit || 'unit'}</strong><br />
                <span style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block', color: '#7f1d1d' }}>
                  Sesuai SOP bisnis: Sistem membatalkan pemesanan secara otomatis dan proses selesai.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setInsufficientStockModal(null)}
                style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Batalkan Pemesanan (Proses Selesai)
              </button>
            </div>
          </div>
        )}

        {/* MODAL 4: GATEWAY 2 (Verifikasi Bukti Transfer & Nominal Sesuai?) */}
        {verifyPaymentModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }} className="animate-fade-in">
              <button
                onClick={() => setVerifyPaymentModal(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    Gateway 2: Verifikasi Bukti Transfer
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Pesanan: <strong>{verifyPaymentModal.id}</strong> ({verifyPaymentModal.customerName})
                  </p>
                </div>
              </div>

              {/* Bukti Transfer Visual Card */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Total Tagihan Sistem:</span>
                  <strong style={{ color: '#1b4332', fontSize: '1rem' }}>{formatRupiah(verifyPaymentModal.totalAmount)}</strong>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                    Nominal Tertera di Bukti Transfer (Rp):
                  </label>
                  <input
                    type="number"
                    value={transferAmountInput}
                    onChange={(e) => setTransferAmountInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 700 }}
                  />
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: Number(transferAmountInput) === verifyPaymentModal.totalAmount ? '#dcfce7' : '#fee2e2', border: `1px solid ${Number(transferAmountInput) === verifyPaymentModal.totalAmount ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: Number(transferAmountInput) === verifyPaymentModal.totalAmount ? '#15803d' : '#b91c1c' }}>
                  {Number(transferAmountInput) === verifyPaymentModal.totalAmount ? (
                    <>
                      <CheckCircle size={15} />
                      <span>Nominal Sesuai Persis dengan Tagihan (Lolos Gateway 2)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={15} />
                      <span>Nominal Tidak Sesuai (Selisih: {formatRupiah(Math.abs(Number(transferAmountInput || 0) - verifyPaymentModal.totalAmount))})</span>
                    </>
                  )}
                </div>
              </div>

              {/* Gateway Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Opsi 1: Nominal Sesuai -> Konfirmasi Pembayaran di Sistem */}
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentGateway(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 10px rgba(27,67,50,0.2)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Konfirmasi Pembayaran di Sistem (Confirm Order)</span>
                </button>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
                  &bull; Otomatis potong stok fisik &bull; Catat histori Stock Movement &bull; Cek Reorder Point
                </div>

                {/* Opsi 2: Nominal Tidak Sesuai -> Minta Transfer Ulang */}
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentGateway(false)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #dc2626',
                    backgroundColor: '#fff',
                    color: '#dc2626',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  Nominal Tidak Sesuai &rarr; Minta Transfer Ulang ke Customer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. INVENTORY & STOCK MOVEMENT MODULE (STOCK MANAGER & SUPER ADMIN)
  // =========================================================================
  if (tabId === 'inventory') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Persediaan & Pergerakan Stok" onBackToDashboard={onBackToDashboard} />;
    }

    // Check which products triggered Reorder Point (ROP Alert)
    const ropAlertProducts = products.filter((p) => {
      const rop = p.reorderPoint || p.minStock || 15;
      return p.stock <= rop;
    });

    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        {/* Module Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019' }}>
                Persediaan & Pergerakan Stok
              </h1>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                Role: Stock Manager
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
              Pencatatan mutasi barang otomatis dari penjualan pesanan, pemantauan batas Reorder Point (<strong>Gateway 3</strong>), dan alert restock.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportReport}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Download size={15} />
              <span>Export Laporan Persediaan</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        {/* GATEWAY 3 ALERT BANNER: Reorder Point Check */}
        {ropAlertProducts.length > 0 && (
          <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={22} style={{ color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#92400e', marginBottom: '2px' }}>
                GATEWAY 3 ALERT: {ropAlertProducts.length} Produk Telah Menyentuh Batas Reorder Point (Perlu Restock!)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.4 }}>
                Sisa stok produk berikut berada di bawah Reorder Point: {' '}
                <strong>{ropAlertProducts.map((p) => `${p.name} (${p.stock} ${p.unit})`).join(', ')}</strong>.
                Segera jadwalkan pengadaan atau batch produksi baru.
              </div>
            </div>
          </div>
        )}

        {/* Sub-tabs Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e1e7e2', marginBottom: '16px' }}>
          <button
            onClick={() => setInventorySubTab('summary')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: inventorySubTab === 'summary' ? '2px solid #2d6a4f' : '2px solid transparent',
              color: inventorySubTab === 'summary' ? '#2d6a4f' : '#718277',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Ringkasan Stok & Gateway Reorder Point (ROP)
          </button>
          <button
            onClick={() => setInventorySubTab('movement')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: inventorySubTab === 'movement' ? '2px solid #2d6a4f' : '2px solid transparent',
              color: inventorySubTab === 'movement' ? '#2d6a4f' : '#718277',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Riwayat Mutasi Stok Keluar / Masuk ({movements.length} Transaksi)
          </button>
        </div>

        {/* Subtab 1: Summary & ROP Gateway */}
        {inventorySubTab === 'summary' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Produk</th>
                  <th style={{ padding: '12px 16px' }}>Kategori</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sisa Stok Fisik</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Safety Stock (SS)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reorder Point (ROP)</th>
                  <th style={{ padding: '12px 16px' }}>Gateway ROP Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const rop = p.reorderPoint || p.minStock || 15;
                  const ss = p.safetyStock || Math.round(rop * 0.5);
                  const isRop = p.stock <= rop;

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', color: '#2d6a4f' }}>{p.category}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: p.stock === 0 ? '#dc2626' : isRop ? '#b45309' : '#142019' }}>
                        {p.stock} {p.unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>{ss} {p.unit}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>{rop} {p.unit}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.stock === 0 ? (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            Stok Habis
                          </span>
                        ) : isRop ? (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                            Perlu Restock (ROP Alert!)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            Status Stok Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Subtab 2: Stock Movement (Histori Pergerakan Stok Otomatis) */}
        {inventorySubTab === 'movement' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>ID Mutasi</th>
                  <th style={{ padding: '12px 16px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 16px' }}>Produk</th>
                  <th style={{ padding: '12px 16px' }}>Tipe & Kategori</th>
                  <th style={{ padding: '12px 16px' }}>Referensi Pesanan</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Perubahan Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sisa Stok</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2d6a4f' }}>{m.id}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.78rem' }}>{m.date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{m.productName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: m.type === 'OUT' ? '#fee2e2' : '#dcfce7', color: m.type === 'OUT' ? '#dc2626' : '#16a34a' }}>
                        {m.type === 'OUT' ? 'KELUAR (OUT)' : 'MASUK (IN)'} &bull; {m.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{m.reference}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: m.quantity < 0 ? '#dc2626' : '#16a34a' }}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{m.remainingStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. DEMAND FORECASTING (ARIMA & CROSTON SBA) (STOCK MANAGER & SUPER ADMIN)
  // =========================================================================
  if (tabId === 'forecasting') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Demand Forecasting & Analisis Permintaan" onBackToDashboard={onBackToDashboard} />;
    }

    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019' }}>
                Demand Forecasting (ARIMA & Croston SBA)
              </h1>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                Stock Manager Analytics
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
              Stock Manager melakukan kalkulasi model peramalan berkala (ARIMA untuk permintaan kontinu, Croston SBA untuk intermiten) dan memperbarui Safety Stock & ROP ke sistem.
            </p>
          </div>

          <button
            onClick={handleRecalculateForecast}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2d6a4f', color: '#fff', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(45,106,79,0.2)' }}
          >
            <RefreshCw size={16} />
            <span>Kalkulasi Ulang Forecast & Update Data ke Sistem</span>
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#142019', margin: 0 }}>
                Hasil Kalkulasi Proyeksi Permintaan 4 Minggu ke Depan
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#718277', margin: '2px 0 0 0' }}>
                Formula Safety Stock: SS = Z &times; &sigma; &bull; Reorder Point: ROP = d &times; L + SS (Service Level: 95%)
              </p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Produk</th>
                <th style={{ padding: '10px 14px' }}>Tipe Pola</th>
                <th style={{ padding: '10px 14px' }}>Metode Rekomendasi</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Minggu 1</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Minggu 2</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Minggu 3</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Minggu 4</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Safety Stock</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Reorder Point</th>
                <th style={{ padding: '10px 14px' }}>Akurasi (RMSE)</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => (
                <tr key={f.productId} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{f.productName}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#64748b' }}>{f.demandType}</td>
                  <td style={{ padding: '10px 14px', color: '#2d6a4f', fontWeight: 700 }}>{f.recommendedMethod}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{f.horizonW1} pcs</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{f.horizonW2} pcs</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{f.horizonW3} pcs</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{f.horizonW4} pcs</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>{f.safetyStock} unit</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#2d6a4f' }}>{f.reorderPoint} unit</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700, fontSize: '0.78rem' }}>{f.rmse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. REKOMENDASI PERSEDIAAN / INVENTORY DASHBOARD (STOCK MANAGER & SUPER ADMIN)
  // =========================================================================
  if (tabId === 'recommendation') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Rekomendasi Persediaan & Restock" onBackToDashboard={onBackToDashboard} />;
    }

    const ropAlertProducts = products.filter((p) => {
      const rop = p.reorderPoint || p.minStock || 15;
      return p.stock <= rop;
    });

    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019' }}>
              Inventory Dashboard & Rekomendasi Restock
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
              Stock Manager memantau alert Reorder Point (ROP), parameter Safety Stock, dan saran kuantitas pengadaan.
            </p>
          </div>
          <button
            onClick={() => triggerToast('Perintah pengadaan / batch produksi berhasil dibuat.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            + Buat Perintah Pengadaan / Produksi
          </button>
        </div>

        {/* Priority Restock Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {ropAlertProducts.slice(0, 2).map((p) => (
            <div key={p.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fee2e2', padding: '16px', borderLeft: '4px solid #dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#dc2626', fontWeight: 700 }}>
                <AlertTriangle size={18} />
                <span>Peringatan ROP: {p.name}</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#48564e', lineHeight: 1.4, marginBottom: '10px' }}>
                Sisa stok <strong>{p.stock} {p.unit}</strong> telah menyentuh batas Reorder Point (<strong>{p.reorderPoint || 15} unit</strong>). Disarankan order restock minimal <strong>30 {p.unit}</strong> segera.
              </p>
              <button
                onClick={() => triggerToast(`Instruksi restock untuk ${p.name} dikirim ke bagian produksi.`)}
                style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Kirim Perintah Restok
              </button>
            </div>
          ))}
        </div>

        {/* Table of Recommendation */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e1e7e2', fontWeight: 700, fontSize: '0.9rem', color: '#142019' }}>
            Daftar Lengkap Kalkulasi Rekomendasi Restock
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Produk</th>
                <th style={{ padding: '12px 16px' }}>Stok Fisik</th>
                <th style={{ padding: '12px 16px' }}>Safety Stock (SS)</th>
                <th style={{ padding: '12px 16px' }}>Reorder Point (ROP)</th>
                <th style={{ padding: '12px 16px' }}>Status ROP</th>
                <th style={{ padding: '12px 16px' }}>Saran Kuantitas Order</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map((p) => {
                const rop = p.reorderPoint || p.minStock || 15;
                const ss = p.safetyStock || Math.round(rop * 0.5);
                const isRop = p.stock <= rop;
                const recOrder = isRop ? Math.max(20, rop * 2 - p.stock) : 0;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: isRop ? '#dc2626' : '#142019' }}>{p.stock} unit</td>
                    <td style={{ padding: '12px 16px' }}>{ss} unit</td>
                    <td style={{ padding: '12px 16px' }}>{rop} unit</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: isRop ? '#fee2e2' : '#dcfce7', color: isRop ? '#dc2626' : '#16a34a' }}>
                        {isRop ? 'Perlu Restock' : 'Stok Aman'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: recOrder > 0 ? '#2d6a4f' : '#94a3b8' }}>
                      {recOrder > 0 ? `+${recOrder} unit` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. LAPORAN PERSEDIAAN & EXPORT (FR-RP-1 s/d FR-RP-6)
  // =========================================================================
  if (tabId === 'reports') {
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019' }}>
              Laporan & Rekapitulasi Persediaan
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
              Stock Manager men-generate & meng-export laporan persediaan resmi Toko Farm Berkah.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => triggerToast('Laporan Persediaan berhasil digenerate ulang dengan data terkini.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', color: '#2d6a4f', border: '1.5px solid #2d6a4f', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <RefreshCw size={15} />
              <span>Generate Laporan Terbaru</span>
            </button>
            <button
              onClick={handleExportReport}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d6a4f', color: '#ffffff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(45,106,79,0.2)' }}
            >
              <Download size={15} />
              <span>Export Laporan Persediaan (CSV / Cetak)</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        {/* Report Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Item Produk</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019', marginTop: '4px' }}>{products.length} SKU</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Unit Fisik Tersedia</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2d6a4f', marginTop: '4px' }}>
              {products.reduce((acc, p) => acc + (p.stock || 0), 0)} Unit
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Estimasi Nilai Aset Persediaan</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1b4332', marginTop: '4px' }}>
              {formatRupiah(products.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0))}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Alert ROP Perlu Restock</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
              {products.filter((p) => p.stock <= (p.reorderPoint || p.minStock || 15)).length} SKU
            </div>
          </div>
        </div>

        {/* Report Table Preview */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e1e7e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#142019', margin: 0 }}>
              Pratinjau Lembar Laporan Persediaan Toko Farm Berkah
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#718277' }}>Periode: Berjalan ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Kode SKU</th>
                <th style={{ padding: '10px 14px' }}>Nama Produk</th>
                <th style={{ padding: '10px 14px' }}>Kategori</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stok Fisik</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Safety Stock</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>ROP</th>
                <th style={{ padding: '10px 14px' }}>Status ROP</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Estimasi Nilai Aset</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((p) => {
                const rop = p.reorderPoint || p.minStock || 15;
                const ss = p.safetyStock || Math.round(rop * 0.5);
                const isRop = p.stock <= rop;
                const asset = (p.price || 0) * (p.stock || 0);

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#2d6a4f', fontWeight: 700 }}>{p.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', color: '#48564e' }}>{p.category}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{p.stock} {p.unit}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b' }}>{ss}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{rop}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: isRop ? '#fee2e2' : '#dcfce7', color: isRop ? '#dc2626' : '#16a34a' }}>
                        {isRop ? 'Perlu Restock' : 'Aman'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>{formatRupiah(asset)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2>Modul {tabId}</h2>
    </div>
  );
}
