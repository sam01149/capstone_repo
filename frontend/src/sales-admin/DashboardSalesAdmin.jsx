import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  QrCode,
  MessageSquare,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  Copy,
  Phone,
  User,
  MapPin,
  Calendar,
  DollarSign,
  LogOut,
  ExternalLink,
  Eye,
  RefreshCw,
  FileText,
  Check,
  Package,
  TrendingUp,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, getStoredProducts } from '../data/productsData';
import {
  getStoredOrders,
  saveStoredOrders,
  resetStoredOrdersToDefault,
  getStoredMovements,
  getStoredDraftInvoices,
  removeDraftInvoice,
  checkProductStock,
  createSalesOrder,
  submitTransferProof,
  verifyAndConfirmPayment,
  generateCustomerQrisWhatsAppUrl,
  generateReTransferWhatsAppUrl,
  simulateCustomerWhatsAppOrder,
  DUMMY_TRANSFER_PROOFS,
  FARMSIGHT_FORECAST_HORIZONS,
} from '../data/ordersAndInventoryData';

export default function DashboardSalesAdmin({ onLogout, onViewCatalog }) {
  const { user } = useAuth();

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [orders, setOrders] = useState(getStoredOrders);
  const [draftInvoices, setDraftInvoices] = useState(getStoredDraftInvoices);
  const [successToast, setSuccessToast] = useState('');

  // Sub-navigation: 'dashboard' (Dashboard Penjualan) or 'orders' (Manajemen Pesanan)
  const [salesView, setSalesView] = useState('dashboard');

  // Modal / Fullscreen States for Gateway 1 & 2
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [insufficientStockModal, setInsufficientStockModal] = useState(null);
  const [qrPaymentModal, setQrPaymentModal] = useState(null);
  const [verifyPaymentModal, setVerifyPaymentModal] = useState(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [reTransferReason, setReTransferReason] = useState('');
  const [receiveProofModalOrder, setReceiveProofModalOrder] = useState(null);
  const [selectedProofIndex, setSelectedProofIndex] = useState(0);
  const [customProofUrl, setCustomProofUrl] = useState('');
  const [proofBankName, setProofBankName] = useState('BCA mobile (QRIS)');
  const [proofAmountInput, setProofAmountInput] = useState('');
  const [viewProofModalOrder, setViewProofModalOrder] = useState(null);

  // Filter States
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxProductFilter, setInboxProductFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [salesHorizon, setSalesHorizon] = useState(4);

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
      setDraftInvoices(getStoredDraftInvoices());
    };
    window.addEventListener('storage', syncAll);
    const interval = setInterval(syncAll, 1500);
    return () => {
      window.removeEventListener('storage', syncAll);
      clearInterval(interval);
    };
  }, []);

  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // Open Create Order Modal with selected Draft Invoice from Customer
  const handleProcessDraftInvoice = (draft) => {
    setNewProductId(draft.productId);
    setNewQuantity(draft.quantity);
    setNewDraftNo(draft.invoiceNo);
    setNewCustName(draft.customerName || 'Ibu Dewi Permata');
    setNewCustPhone(draft.customerPhone || '+62 813-2233-4455');
    setNewCustAddress(draft.customerAddress || 'Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur');
    setIsCreateOrderModalOpen(true);
  };

  // Submit Create Order Form (GATEWAY 1: Cek Stok Fisik)
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

    if (newDraftNo) {
      removeDraftInvoice(newDraftNo);
      setDraftInvoices((prev) => prev.filter((d) => d.invoiceNo !== newDraftNo));
    }

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

  // Kirim QR Code ke WhatsApp Customer secara langsung melalui URL WhatsApp Resmi
  const handleSendQrisWhatsApp = () => {
    if (!qrPaymentModal) return;
    const targetOrder = qrPaymentModal;
    const waUrl = generateCustomerQrisWhatsAppUrl(targetOrder);
    window.open(waUrl, '_blank');

    // Update status pesanan di sistem menjadi MENUNGGU_PEMBAYARAN
    const currentOrders = getStoredOrders();
    const updated = currentOrders.map((o) => {
      if (o.id === targetOrder.id) {
        return {
          ...o,
          status: 'MENUNGGU_PEMBAYARAN',
          gateway1Status: 'LOLOS',
          gateway2Status: 'MENUNGGU_BAYAR',
          qrisSent: true,
          qrisSentAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        };
      }
      return o;
    });
    saveStoredOrders(updated);
    setOrders(updated);
    setQrPaymentModal(null);
    triggerToast(
      `✓ Berhasil! Rincian pesanan & link QRIS resmi (${formatRupiah(targetOrder.totalAmount)}) telah dikirim ke WhatsApp ${targetOrder.customerName}. Status pesanan di sistem kini: Menunggu Pembayaran.`
    );
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
      const note =
        reTransferReason ||
        `Nominal transfer (Rp ${Number(transferAmountInput || 0).toLocaleString('id-ID')}) belum sesuai tagihan (${formatRupiah(verifyPaymentModal.totalAmount)}). Silakan transfer ulang kekurangannya ke QRIS Toko Farm Berkah.`;
      const result = verifyAndConfirmPayment(verifyPaymentModal.id, false, note);

      // Buka pesan WhatsApp ke customer untuk minta transfer ulang
      const waUrl = generateReTransferWhatsAppUrl(verifyPaymentModal, note);
      window.open(waUrl, '_blank');

      setVerifyPaymentModal(null);
      setOrders(getStoredOrders());
      triggerToast(`⚠️ ${result.message} Pesan permintaan transfer ulang telah dikirimkan ke WhatsApp pelanggan.`);
    } else {
      const result = verifyAndConfirmPayment(verifyPaymentModal.id, true);
      setVerifyPaymentModal(null);
      setOrders(getStoredOrders());
      setProducts(getStoredProducts());
      triggerToast(
        `✓ ${result.message} ${result.isRopTriggered ? '⚠️ ' + result.ropAlert : '✅ ' + result.ropAlert}`
      );
    }
  };

  // Buka modal input bukti transfer yang diterima Sales Admin dari WhatsApp customer
  const handleOpenReceiveProof = (order) => {
    setReceiveProofModalOrder(order);
    setSelectedProofIndex(0);
    setCustomProofUrl('');
    setProofBankName('BCA mobile (QRIS)');
    setProofAmountInput(String(order.totalAmount || 20000));
  };

  // Filtered draft invoices
  const filteredDrafts = draftInvoices.filter((d) => {
    const matchSearch =
      (d.invoiceNo || '').toLowerCase().includes(inboxSearch.toLowerCase()) ||
      (d.customerName || '').toLowerCase().includes(inboxSearch.toLowerCase()) ||
      (d.productName || '').toLowerCase().includes(inboxSearch.toLowerCase());
    const matchProduct = inboxProductFilter === 'ALL' || d.productId === inboxProductFilter;
    return matchSearch && matchProduct;
  });

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.id || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customerPhone || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.productName || '').toLowerCase().includes(orderSearch.toLowerCase());

    const matchStatus =
      orderStatusFilter === 'ALL' ||
      (orderStatusFilter === 'WAITING_PAYMENT' && (o.status === 'MENUNGGU_PEMBAYARAN' || o.gateway2Status === 'MENUNGGU_BAYAR' || o.gateway2Status === 'MENUNGGU_TRANSFER')) ||
      (orderStatusFilter === 'NEED_VERIFY' && (o.status === 'SUDAH_BAYAR' || (o.transferProofImage && o.status !== 'SELESAI' && o.status !== 'DIBATALKAN'))) ||
      (orderStatusFilter === 'RE_TRANSFER' && (o.status === 'PERLU_TRANSFER_ULANG' || o.gateway2Status === 'TRANSFER_ULANG')) ||
      (orderStatusFilter === 'COMPLETED' && (o.status === 'SELESAI' || o.gateway2Status === 'LOLOS'));

    return matchSearch && matchStatus;
  });

  // Calculate quick stats for Sales Admin
  const statsTotalOrders = orders.length;
  const statsWaitingPayment = orders.filter((o) => o.status === 'MENUNGGU_PEMBAYARAN' || o.gateway2Status === 'MENUNGGU_BAYAR' || o.gateway2Status === 'MENUNGGU_TRANSFER').length;
  const statsNeedVerifyProof = orders.filter((o) => (o.status === 'SUDAH_BAYAR' || o.transferProofImage) && o.status !== 'SELESAI' && o.status !== 'DIBATALKAN').length;
  const statsReTransfer = orders.filter((o) => o.status === 'PERLU_TRANSFER_ULANG' || o.gateway2Status === 'TRANSFER_ULANG').length;
  const statsCompleted = orders.filter((o) => o.status === 'SELESAI' || o.gateway2Status === 'LOLOS').length;
  const statsRevenue = orders
    .filter((o) => o.status === 'SELESAI' || o.gateway2Status === 'LOLOS')
    .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const statsPendingAction = statsWaitingPayment + statsNeedVerifyProof + statsReTransfer;

  // 1. TAMPILAN FULL LAYAR: INPUT PESANAN BARU (GATEWAY 1)
  if (isCreateOrderModalOpen) {
    const targetProd = products.find((p) => p.id === newProductId);
    const orderQty = parseInt(newQuantity, 10) || 1;
    const currentStock = targetProd?.stock ?? 0;
    const isStockAvailable = currentStock >= orderQty;

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f4' }}>
        {/* Top Header */}
        <header style={{ height: '64px', backgroundColor: '#ffffff', borderBottom: '1px solid #e1e7e2', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>🌱</span>
            <span style={{ fontWeight: 800, color: '#1b4332', fontSize: '1.1rem' }}>Toko Farm Berkah</span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Sales Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOrderModalOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Pesanan</span>
          </button>
        </header>

        <div style={{ maxWidth: '1060px', margin: '24px auto', padding: '0 20px' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCreateOrderModalOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #d8e2da',
                  color: '#1b4332',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '7px 14px',
                  borderRadius: '8px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Kembali</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                <span style={{ cursor: 'pointer', color: '#2d6a4f', fontWeight: 600 }} onClick={() => setIsCreateOrderModalOpen(false)}>
                  Manajemen Pesanan
                </span>
                <span>/</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Input Pesanan Baru</span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
              Role: Sales Admin
            </span>
          </div>

          <form onSubmit={handleCreateOrderSubmit}>
            {/* Header Form */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '22px 26px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    Input Pesanan Baru
                  </h1>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    SOP Gateway 1: Cek & validasi ketersediaan stok fisik sebelum menerbitkan QRIS.
                  </span>
                </div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔒</span>
                <span>Rincian data pesanan di bawah ini dikirimkan langsung oleh customer dan terkunci di sistem sesuai SOP Toko Farm Berkah.</span>
              </div>
            </div>

            {/* Grid 2 Kolom Seimbang */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
              {/* Kolom 1: Data Resmi Pelanggan */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Data Resmi Pelanggan (WhatsApp)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    Terkunci
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                    Nomor Draft Invoice Customer:
                  </label>
                  <div style={{ height: '38px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 700, color: '#1b4332', fontFamily: 'monospace' }}>
                    <FileText size={15} style={{ color: '#2d6a4f' }} />
                    <span>{newDraftNo || 'DRAFT-INV-20261105-929'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                      Nama Pelanggan:
                    </label>
                    <div style={{ height: '38px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                      <User size={15} style={{ color: '#94a3b8' }} />
                      <span>{newCustName || 'Ibu Dewi Permata'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                      No. WhatsApp / HP:
                    </label>
                    <div style={{ height: '38px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                      <Phone size={15} style={{ color: '#94a3b8' }} />
                      <span>{newCustPhone || '+62 813-2233-4455'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                    Alamat Lengkap Pengiriman:
                  </label>
                  <div style={{ minHeight: '74px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                    <MapPin size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
                    <span>{newCustAddress || 'Jl. Dahlia No. 12, Pulo Gebang, Jakarta Timur'}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#15803d', marginBottom: '3px' }}>
                    <CheckCircle2 size={14} />
                    <span>Status Verifikasi Data Pelanggan: Terverifikasi</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Data identitas, kontak WhatsApp, dan nomor invoice telah tersinkronisasi otomatis dari permohonan customer.
                  </div>
                </div>
              </div>

              {/* Kolom 2: Rincian Pesanan & Verifikasi Stok */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Rincian Pesanan & Verifikasi Stok
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    Gateway 1
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                      Produk Pesanan:
                    </label>
                    <div style={{ height: '38px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700, color: '#142019' }}>
                      {targetProd?.name || newProductId} ({formatRupiah(targetProd?.price || 2000)})
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
                      Kuantitas Pesanan:
                    </label>
                    <div style={{ height: '38px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 800, color: '#1b4332' }}>
                      {orderQty} unit ({targetProd?.unit || 'PCS'})
                    </div>
                  </div>
                </div>

                {/* Total Tagihan */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Tagihan Pembayaran:</div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{orderQty} unit × {formatRupiah(targetProd?.price || 2000)}</div>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1b4332', fontFamily: 'monospace' }}>
                    {formatRupiah((targetProd?.price || 2000) * orderQty)}
                  </div>
                </div>

                {/* Kotak Verifikasi Stok Fisik Toko */}
                <div style={{ backgroundColor: isStockAvailable ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${isStockAvailable ? '#86efac' : '#fca5a5'}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isStockAvailable ? '#166534' : '#991b1b' }}>
                      Status Verifikasi Stok Fisik:
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: isStockAvailable ? '#dcfce7' : '#fee2e2', color: isStockAvailable ? '#15803d' : '#dc2626' }}>
                      {isStockAvailable ? '✓ Stok Tersedia' : '✕ Stok Habis / Kurang'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', backgroundColor: '#ffffff', borderRadius: '8px', padding: '10px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Stok di Toko</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{currentStock} unit</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Jumlah Pesanan</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0369a1' }}>{orderQty} unit</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Sisa Estimasi</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isStockAvailable ? '#16a34a' : '#dc2626' }}>
                        {currentStock - orderQty} unit
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: isStockAvailable ? '#15803d' : '#b91c1c', lineHeight: 1.45 }}>
                    {isStockAvailable
                      ? 'Stok fisik toko mencukupi. Klik "Proses" untuk mereservasi stok dan menerbitkan QR Code pembayaran QRIS ke customer.'
                      : 'Stok fisik toko tidak mencukupi permintaan. Klik "Proses" untuk membatalkan pesanan otomatis.'}
                  </div>
                </div>

                {/* Tombol Tindakan Batal & Proses */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px', marginTop: 'auto', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOrderModalOpen(false)}
                    style={{ padding: '12px 18px', borderRadius: '10px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(45, 106, 79, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>Proses</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. TAMPILAN FULL LAYAR: QRIS RESMI TOKO FARM BERKAH (GATEWAY 1 SUKSES)
  if (qrPaymentModal) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f4' }}>
        {/* Top Header */}
        <header style={{ height: '64px', backgroundColor: '#ffffff', borderBottom: '1px solid #e1e7e2', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>🌱</span>
            <span style={{ fontWeight: 800, color: '#1b4332', fontSize: '1.1rem' }}>Toko Farm Berkah</span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Sales Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQrPaymentModal(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Daftar Pesanan</span>
          </button>
        </header>

        <div style={{ maxWidth: '640px', margin: '24px auto', padding: '0 20px' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
              }}
            >
              <ArrowLeft size={15} />
              <span>Kembali</span>
            </button>
            <span style={{ fontSize: '0.74rem', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>
              ✓ Gateway 1 Lolos: Stok Direservasi
            </span>
          </div>

          {/* Card Terpusat: QRIS Resmi Toko Farm Berkah */}
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

            {/* Poster QRIS Resmi */}
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
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Tujuan WhatsApp Customer Pemesan:</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                  {qrPaymentModal.customerName} • {qrPaymentModal.customerPhone}
                </div>
              </div>
            </div>

            {/* Keterangan Integrasi Sistem WhatsApp Toko Farm Berkah */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#166534',
                fontSize: '0.8rem',
                lineHeight: '1.45',
              }}
            >
              <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: '#15803d' }}>Pengiriman Otomatis Langsung dari Sistem</strong>
                <span>Setelah tombol diklik, sistem otomatis mengirimkan QRIS dan nominal tagihan tepat <strong>{formatRupiah(qrPaymentModal.totalAmount)}</strong> ke WhatsApp customer ({qrPaymentModal.customerPhone}).</span>
              </div>
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
                <span>Kirim QR Code via WhatsApp ke Customer</span>
              </button>

              <button
                type="button"
                onClick={() => setQrPaymentModal(null)}
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
                Tutup QRIS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. TAMPILAN UTAMA DASHBOARD SALES ADMIN
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f4' }}>
      {/* Top Navbar Sales Admin */}
      <header
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e1e7e2',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#1b4332', fontSize: '1.05rem', lineHeight: 1.2 }}>
              Toko Farm Berkah
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Portal Operasional Penjualan
            </div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                color: '#2d6a4f',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={13} />
              <span>Lihat Katalog Publik</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
              SR
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                {user?.name || 'Siti Rahmawati'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600 }}>
                Sales Admin
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Keluar dari sistem"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Toast Notifikasi */}
        {successToast && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Tab Switcher: Dashboard Penjualan (Utama) vs Manajemen Pesanan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => setSalesView('dashboard')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: salesView === 'dashboard' ? '#2d6a4f' : '#ffffff',
              color: salesView === 'dashboard' ? '#ffffff' : '#475569',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: salesView === 'dashboard' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <TrendingUp size={16} />
            <span>Dashboard Penjualan</span>
          </button>
          <button
            type="button"
            onClick={() => setSalesView('orders')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: salesView === 'orders' ? '#2d6a4f' : '#ffffff',
              color: salesView === 'orders' ? '#ffffff' : '#475569',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: salesView === 'orders' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <ShoppingCart size={16} />
            <span>Manajemen Pesanan</span>
            {statsPendingAction > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontWeight: 800,
                }}
              >
                {statsPendingAction}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: DASHBOARD PENJUALAN (UTAMA) */}
        {salesView === 'dashboard' && (() => {
          const fallbackHorizon = {
            period: '5 Okt sampai 1 Nov 2026',
            totalRevenue: 'Rp 273.049',
            avgWeekly: 'Rp 68.262',
            totalDemand: '24,6 unit',
            activeProducts: '9 produk',
            bars: [
              { label: '5 Okt', value: '82,3', height: 48 },
              { label: '12 Okt', value: '142,9', height: 82 },
              { label: '19 Okt', value: '209,3', height: 118 },
              { label: '26 Okt', value: '273,0', height: 154 },
            ],
          };
          const horizonData = (FARMSIGHT_FORECAST_HORIZONS && FARMSIGHT_FORECAST_HORIZONS[salesHorizon]) || fallbackHorizon;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Banner Ucapan & Status Kerja Sales Admin */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>👋</span>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Dashboard Operasional Penjualan
                    </h1>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Selamat bertugas, <strong>{user?.name || 'Siti Rahmawati'}</strong>! Pantau performa omzet dan proses pesanan masuk dari WhatsApp pelanggan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSalesView('orders')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(45, 106, 79, 0.25)',
                  }}
                >
                  <ShoppingCart size={15} />
                  <span>Buka Manajemen Pesanan</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Attention Alert jika ada pesanan pending */}
              {statsPendingAction > 0 && (
                <div
                  style={{
                    backgroundColor: '#fefce8',
                    border: '1.5px solid #fef08a',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#854d0e', fontSize: '0.84rem' }}>
                    <AlertTriangle size={18} style={{ color: '#ca8a04', flexShrink: 0 }} />
                    <span>
                      Ada <strong>{statsPendingAction} pesanan aktif</strong> yang membutuhkan tindakan Anda ({statsWaitingPayment} menunggu pembayaran QRIS, {statsNeedVerifyProof} perlu verifikasi bukti transfer).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSalesView('orders')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#ca8a04',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Proses Sekarang &rarr;
                  </button>
                </div>
              )}

              {/* 4 Kartu Metrik Operasional Penjualan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Seluruh Pesanan</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#142019', marginTop: '4px' }}>{statsTotalOrders}</div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '2px' }}>Tersinkronisasi real-time</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Menunggu Pembayaran QRIS</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ca8a04', marginTop: '4px' }}>{statsWaitingPayment}</div>
                  <div style={{ fontSize: '0.72rem', color: '#854d0e', marginTop: '2px' }}>Stok telah direservasi</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Perlu Verifikasi Struk</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>{statsNeedVerifyProof}</div>
                  <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '2px' }}>Bukti terkirim via WA</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Omzet Penjualan</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1b4332', marginTop: '4px' }}>{formatRupiah(statsRevenue)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>{statsCompleted} transaksi terverifikasi</div>
                </div>
              </div>

              {/* MODUL FORECAST PENDAPATAN (PERSIS GAMBAR 1 & 4) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                      Forecast Pendapatan
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      Estimasi pendapatan dari prediksi demand dikali harga satuan, untuk horizon yang Anda pilih.
                    </p>
                    <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600, marginTop: '8px' }}>
                      Periode: <strong>5 Okt sampai 1 Nov 2026</strong>
                    </div>
                  </div>

                  {/* Horizon Forecast Selector (Pills Ungu) */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', textAlign: 'right' }}>
                      HORIZON FORECAST
                    </div>
                    <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                      {[1, 2, 3, 4].map((h) => {
                        const isSel = salesHorizon === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setSalesHorizon(h)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: isSel ? '#7c3aed' : 'transparent',
                              color: isSel ? '#ffffff' : '#475569',
                              fontWeight: isSel ? 800 : 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              boxShadow: isSel ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {h} minggu
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4 Cards Metrik Horizon */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fbf7ff', border: '1px solid #f3e8ff' }}>
                    <div style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: 600 }}>Total estimasi pendapatan</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#6d28d9', marginTop: '6px' }}>
                      {horizonData.totalRevenue}
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rata-rata per minggu</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                      {horizonData.avgWeekly}
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total prediksi demand</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                      {horizonData.totalDemand}
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Produk dengan prediksi</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                      {horizonData.activeProducts}
                    </div>
                  </div>
                </div>

                {/* Grafik Batang Kumulatif Ungu + Garis Teal */}
                <div style={{ height: '220px', position: 'relative', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 40px 10px 40px' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '25%', borderTop: '1px dashed #e2e8f0' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '50%', borderTop: '1px dashed #e2e8f0' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '75%', borderTop: '1px dashed #e2e8f0' }} />

                  {(horizonData.bars || []).map((bar, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6d28d9' }}>
                        {bar.value} rb
                      </div>
                      <div
                        style={{
                          width: '54px',
                          height: `${Math.max(25, bar.height * 1.6)}px`,
                          backgroundColor: '#7c3aed',
                          borderRadius: '6px 6px 0 0',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                        }}
                      />
                      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                        {bar.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend & Catatan */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#7c3aed', borderRadius: '3px' }} />
                    <span>Estimasi kumulatif</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                    <div style={{ width: '12px', height: '3px', backgroundColor: '#0f766e', borderRadius: '2px' }} />
                    <span>Garis kumulatif</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                  Ini estimasi, bukan pendapatan aktual. Hanya mencakup 9 produk yang memiliki prediksi model; produk dengan metode heuristik dan produk tidak aktif tidak termasuk, jadi totalnya lebih rendah dari pendapatan aktual.
                </div>
              </div>

              {/* Ringkasan Penjualan Produk (Tabel Produk Terlaris) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                  Ringkasan Penjualan Produk Terlaris
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {(products || []).slice(0, 4).map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Stok fisik tersisa: {p.stock} {p.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>{p.priceFormatted}</div>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                          {p.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: MANAJEMEN PESANAN (SESUAI SOP INTERAKSI CUSTOMER & SALES ADMIN) */}
        {salesView === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Modul Manajemen Pesanan - Sesuai Permintaan: Tombol Input Manual Dihapus */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Manajemen Pesanan Toko Farm Berkah
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Alur interaksi pesanan via WhatsApp &bull; Validasi Stok &bull; Kirim QRIS &bull; Konfirmasi Pembayaran
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                  <span>Sistem Siap Menerima Pesanan WhatsApp</span>
                </span>
              </div>
            </div>

            {/* Panduan Ramah Milenial & Staf Senior (Langkah Mudah SOP Penjualan) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: '#16a34a' }} />
                <span>Panduan Praktis Alur Penjualan (Toko Farm Berkah):</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#2d6a4f', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem' }}>1</span>
                    <span>Pesanan Masuk (WA)</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                    Customer kirim pesanan lewat WhatsApp. Pesanan otomatis tampil di daftar ini secara real-time.
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#2d6a4f', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem' }}>2</span>
                    <span>Kirim QRIS via WA</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                    Klik <strong>[Kirim QRIS via WA]</strong>. QRIS & nominal terkirim langsung. Status: <em>Menunggu Pembayaran</em>.
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#2d6a4f', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem' }}>3</span>
                    <span>Terima Bukti Transfer</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                    Customer scan QRIS dan kirim bukti via WA. Klik <strong>[Catat Bukti WA]</strong> untuk menyinkronkan struk.
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#2d6a4f', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem' }}>4</span>
                    <span>Verifikasi & Selesai</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                    Cek nominal. Jika sesuai, konfirmasi untuk potong stok & catat histori. Jika kurang, minta transfer ulang via WA.
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Daftar Seluruh Pesanan */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    Daftar Pesanan Toko Farm Berkah ({orders.length} Pesanan)
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Tombol Simulasi Cepat WhatsApp untuk Penguji */}
                  <button
                    type="button"
                    onClick={() => {
                      simulateCustomerWhatsAppOrder();
                      setOrders(getStoredOrders());
                      triggerToast('✓ Berhasil menambahkan 1 pesanan simulasi WhatsApp dari Ibu Dewi Permata (Gorengan 10 unit • Rp 20.000)!');
                    }}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Buat simulasi 1 pesanan masuk via WhatsApp untuk pengujian alur"
                  >
                    <Plus size={13} />
                    <span>Simulasi Pesanan WA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Kosongkan daftar pesanan?')) {
                        const def = resetStoredOrdersToDefault();
                        setOrders(def);
                        triggerToast('✓ Daftar pesanan berhasil dikosongkan.');
                      }
                    }}
                    style={{
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Kosongkan daftar pesanan"
                  >
                    <RefreshCw size={12} />
                    <span>Kosongkan Tabel</span>
                  </button>

                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Cari pesanan, pelanggan, produk..."
                    style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '220px' }}
                  />

                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    style={{ height: '34px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    <option value="ALL">Semua Status Pesanan</option>
                    <option value="WAITING_PAYMENT">⏳ Menunggu Pembayaran</option>
                    <option value="NEED_VERIFY">🔍 Sudah Bayar (Perlu Cek)</option>
                    <option value="RE_TRANSFER">⚠️ Perlu Transfer Ulang</option>
                    <option value="COMPLETED">✓ Lunas Terverifikasi</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>No. Pesanan</th>
                      <th style={{ padding: '12px 16px' }}>Pelanggan</th>
                      <th style={{ padding: '12px 16px' }}>Produk & Qty</th>
                      <th style={{ padding: '12px 16px' }}>Total Tagihan</th>
                      <th style={{ padding: '12px 16px' }}>Gateway 1 (Stok)</th>
                      <th style={{ padding: '12px 16px' }}>Bukti Bayar</th>
                      <th style={{ padding: '12px 16px' }}>Gateway 2 (Bayar)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ShoppingCart size={28} />
                            </div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                              Belum Ada Pesanan Masuk
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                              Daftar pesanan saat ini kosong. Pesanan yang dikirimkan pelanggan melalui WhatsApp akan otomatis tampil di sini secara real-time.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                simulateCustomerWhatsAppOrder();
                                setOrders(getStoredOrders());
                                triggerToast('✓ 1 Pesanan simulasi WhatsApp berhasil ditambahkan untuk pengujian alur!');
                              }}
                              style={{
                                marginTop: '6px',
                                padding: '9px 18px',
                                borderRadius: '8px',
                                backgroundColor: '#2d6a4f',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(45, 106, 79, 0.25)',
                              }}
                            >
                              + Buat Simulasi 1 Pesanan Masuk via WhatsApp (Uji Coba Cepat)
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>
                          <div>{o.id}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{o.createdAt || 'Baru'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{o.customerName}</div>
                          <a
                            href={`https://api.whatsapp.com/send?phone=${(o.customerPhone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Buka Chat WhatsApp Pelanggan"
                          >
                            <span>📱 {o.customerPhone}</span>
                          </a>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{o.productName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{o.quantity} unit ({o.unit || 'PCS'})</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1b4332' }}>
                          {formatRupiah(o.totalAmount)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {o.gateway1Status === 'LOLOS' || o.stockReserved || o.status !== 'DIBATALKAN' ? (
                            <span style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>✓</span>
                              <span>Lolos (Direservasi)</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                              ✕ Batal (Stok Kurang)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {o.transferProofImage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span>✓</span>
                                <span>Terkirim via WA</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewProofModalOrder(o)}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bae6fd',
                                  backgroundColor: '#ffffff',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Lihat foto bukti transfer pelanggan"
                              >
                                <Eye size={11} />
                                <span>Lihat Struk</span>
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#ca8a04', fontWeight: 700 }}>
                                ⏳ Menunggu Customer
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenReceiveProof(o)}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px dashed #0284c7',
                                  backgroundColor: '#f0f9ff',
                                  color: '#0369a1',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                                title="Catat bukti transfer yang dikirim customer via WhatsApp"
                              >
                                + Catat Bukti WA
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {o.gateway2Status === 'LOLOS' || o.status === 'SELESAI' ? (
                            <span style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                              ✓ Lunas (Lolos SOP)
                            </span>
                          ) : o.gateway2Status === 'TRANSFER_ULANG' || o.status === 'PERLU_TRANSFER_ULANG' ? (
                            <span style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                              ⚠️ Minta Transfer Ulang
                            </span>
                          ) : o.transferProofImage || o.status === 'SUDAH_BAYAR' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800, border: '1px solid #bae6fd' }}>
                                Sudah Bayar
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                                (🔍 Perlu Cek)
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '12px', backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 700 }}>
                              Menunggu Bayar
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Tombol Kirim QRIS jika belum selesai */}
                            {o.status !== 'SELESAI' && o.status !== 'DIBATALKAN' && (
                              <button
                                onClick={() => setQrPaymentModal(o)}
                                style={{ padding: '5px 9px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Buka QRIS Resmi & Kirim ke WhatsApp Customer"
                              >
                                <QrCode size={13} />
                                <span>{o.qrisSent ? 'Kirim Ulang QRIS' : 'Kirim QRIS via WA'}</span>
                              </button>
                            )}

                            {/* Tombol Hubungi WA Customer jika perlu transfer ulang */}
                            {o.status === 'PERLU_TRANSFER_ULANG' && (
                              <button
                                onClick={() => {
                                  const waUrl = generateReTransferWhatsAppUrl(o);
                                  window.open(waUrl, '_blank');
                                }}
                                style={{ padding: '5px 9px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Hubungi customer via WhatsApp untuk transfer ulang"
                              >
                                <MessageSquare size={13} />
                                <span>Hubungi WA</span>
                              </button>
                            )}

                            {/* Tombol Verifikasi Gateway 2 jika bukti bayar sudah terkirim / status Sudah Bayar */}
                            {o.transferProofImage && o.status !== 'SELESAI' && o.status !== 'DIBATALKAN' ? (
                              <button
                                onClick={() => handleOpenVerifyPayment(o)}
                                style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#2d6a4f', color: '#ffffff', border: 'none', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(45, 106, 79, 0.3)' }}
                                title="Verifikasi bukti transfer dari customer"
                              >
                                <Check size={13} />
                                <span>Verifikasi Bayar</span>
                              </button>
                            ) : o.status === 'SELESAI' ? (
                              <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 800, backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}>
                                ✓ Siap Kirim
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL GATEWAY 2: VERIFIKASI BUKTI BAYAR */}
        {verifyPaymentModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '460px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Verifikasi Pembayaran (Gateway 2)
                </h3>
                <button
                  type="button"
                  onClick={() => setVerifyPaymentModal(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem' }}>
                <div>Pesanan: <strong>{verifyPaymentModal.id}</strong> ({verifyPaymentModal.customerName})</div>
                <div>Tagihan: <strong>{formatRupiah(verifyPaymentModal.totalAmount)}</strong></div>
              </div>

              {/* Thumbnail Bukti Bayar Customer */}
              {verifyPaymentModal.transferProofImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <img
                    src={verifyPaymentModal.transferProofImage}
                    alt="Bukti Transfer Pelanggan"
                    style={{ width: '56px', height: '72px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                    onClick={() => setViewProofModalOrder(verifyPaymentModal)}
                    title="Klik untuk melihat bukti ukuran penuh"
                  />
                  <div style={{ fontSize: '0.75rem', flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#166534' }}>✓ Bukti Struk Terlampir</div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>
                      Bank: <strong>{verifyPaymentModal.transferBank || 'QRIS'}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewProofModalOrder(verifyPaymentModal)}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, padding: 0, cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', marginTop: '3px' }}
                    >
                      Perbesar Gambar Struk
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>
                  Nominal Transfer yang Masuk di Rekening / QRIS:
                </label>
                <input
                  type="number"
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              {Number(transferAmountInput) !== verifyPaymentModal.totalAmount && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#dc2626', fontWeight: 700, marginBottom: '4px' }}>
                    Alasan Minta Transfer Ulang (Nominal Belum Pas):
                  </label>
                  <input
                    type="text"
                    value={reTransferReason}
                    onChange={(e) => setReTransferReason(e.target.value)}
                    placeholder="Contoh: Nominal kurang Rp 5.000..."
                    style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.78rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentGateway(false)}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Minta Transfer Ulang
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentGateway(true)}
                  style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  ✓ Setujui Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL INSUFFICIENT STOCK */}
        {insufficientStockModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '420px', padding: '22px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                Stok Fisik Tidak Mencukupi!
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Sisa stok di toko ({insufficientStockModal.availableStock} unit) tidak mencukupi permintaan pesanan ({insufficientStockModal.requestedQty} unit). Sesuai SOP Gateway 1, pesanan ini otomatis dibatalkan dan QRIS tidak diterbitkan.
              </p>
              <button
                type="button"
                onClick={() => setInsufficientStockModal(null)}
                style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#475569', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', marginTop: '6px' }}
              >
                Tutup Notifikasi
              </button>
            </div>
          </div>
        )}

        {/* MODAL LIHAT BUKTI TRANSFER PEMBAYARAN CUSTOMER */}
        {viewProofModalOrder && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '460px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Bukti Transfer Pembayaran
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Pesanan: <strong>{viewProofModalOrder.id}</strong> • {viewProofModalOrder.customerName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewProofModalOrder(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>

              {/* Tampilan Gambar Struk */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', maxHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                <img
                  src={viewProofModalOrder.transferProofImage}
                  alt="Struk Transfer Pelanggan"
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                />
              </div>

              {/* Detail Transaksi */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Bank / E-Wallet:</span>
                  <strong style={{ color: '#0f172a' }}>{viewProofModalOrder.transferBank || 'QRIS Domestik'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Nominal Ditransfer:</span>
                  <strong style={{ color: '#15803d' }}>{formatRupiah(viewProofModalOrder.transferAmount || viewProofModalOrder.totalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Tagihan:</span>
                  <strong style={{ color: '#0f172a' }}>{formatRupiah(viewProofModalOrder.totalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Waktu Kirim:</span>
                  <span style={{ color: '#475569' }}>{viewProofModalOrder.transferTime || '5 Nov 2026, 21:05 WIB'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setViewProofModalOrder(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Tutup
                </button>
                {viewProofModalOrder.status !== 'SELESAI' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewProofModalOrder;
                      setViewProofModalOrder(null);
                      handleOpenVerifyPayment(target);
                    }}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Verifikasi Pembayaran
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL PENERIMAAN BUKTI TRANSFER DARI WHATSAPP OLEH SALES ADMIN */}
        {receiveProofModalOrder && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '520px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Catat Bukti Transfer dari WhatsApp
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Pesanan: <strong>{receiveProofModalOrder.id}</strong> • {receiveProofModalOrder.customerName} ({receiveProofModalOrder.customerPhone})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiveProofModalOrder(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Rincian Pesanan */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Produk & Kuantitas:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{receiveProofModalOrder.productName} ({receiveProofModalOrder.quantity} unit)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Total Tagihan:</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1b4332' }}>{formatRupiah(receiveProofModalOrder.totalAmount)}</div>
                </div>
              </div>

              {/* Pilih Bukti Transfer yang Diterima di WhatsApp */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Pilih Struk Bukti Transfer yang Diterima dari Chat WhatsApp Customer:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {DUMMY_TRANSFER_PROOFS.slice(0, 4).map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProofIndex(idx);
                        setCustomProofUrl('');
                        setProofBankName(p.bank);
                        setProofAmountInput(String(receiveProofModalOrder.totalAmount));
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: selectedProofIndex === idx && !customProofUrl ? '2px solid #2d6a4f' : '1px solid #cbd5e1',
                        backgroundColor: selectedProofIndex === idx && !customProofUrl ? '#f0fdf4' : '#ffffff',
                        color: selectedProofIndex === idx && !customProofUrl ? '#1b4332' : '#334155',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>{p.bank}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{formatRupiah(receiveProofModalOrder.totalAmount)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Atau Upload Foto Struk dari Komputer */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Atau Unggah File Foto Struk yang Dikirim Customer dari WhatsApp:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setCustomProofUrl(event.target.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ fontSize: '0.74rem', color: '#64748b' }}
                />
              </div>

              {/* Field Nominal yang Ditransfer Customer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nominal Transfer Customer:
                  </label>
                  <input
                    type="number"
                    value={proofAmountInput}
                    onChange={(e) => setProofAmountInput(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Bank / E-Wallet Pengirim:
                  </label>
                  <input
                    type="text"
                    value={proofBankName}
                    onChange={(e) => setProofBankName(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setReceiveProofModalOrder(null)}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalImg = customProofUrl || DUMMY_TRANSFER_PROOFS[selectedProofIndex]?.imageUrl;
                    const finalAmt = Number(proofAmountInput) || receiveProofModalOrder.totalAmount;
                    submitTransferProof(
                      receiveProofModalOrder.id,
                      finalImg,
                      finalAmt,
                      proofBankName,
                      'Diterima via WhatsApp'
                    );
                    setReceiveProofModalOrder(null);
                    setOrders(getStoredOrders());
                    triggerToast(`✓ Bukti transfer pesanan ${receiveProofModalOrder.id} berhasil dicatat dari WhatsApp! Status kini: Sudah Bayar (Perlu Cek). Silakan klik tombol "Verifikasi Bayar".`);
                  }}
                  style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(45, 106, 79, 0.25)' }}
                >
                  ✓ Simpan Bukti dari WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

