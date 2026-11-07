import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  QrCode,
  Receipt,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Package,
  Calendar,
  Store,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  ChevronRight,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, getStoredProducts, cleanUnit, formatQtyUnit } from '../data/productsData';
import {
  getStoredOrders,
  getStoredDraftInvoices,
  generateStockCancelledWhatsAppUrl,
  generateCustomerQrisWhatsAppUrl,
  markQrisSent,
} from '../data/ordersAndInventoryData';
import {
  ORDER_STATUS,
  FormInputPesanan,
  ModalKirimQris,
  ModalCatatBukti,
  ModalVerifikasi,
  ModalDetailPesanan,
  copyQrisImage,
  EmptyState,
  useToast,
  useStoreSync,
} from './PesananCustomer';

export default function DashboardSalesAdmin({ onLogout, onViewCatalog }) {
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  // State navigasi tab: 'dashboard' (Ringkasan Kinerja) atau 'orders' (Manajemen Pesanan)
  // Dilengkapi persistensi sessionStorage agar saat halaman di-refresh tetap di tab yang sedang aktif
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sales_admin_active_tab');
      return saved === 'orders' || saved === 'dashboard' ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('sales_admin_active_tab', activeMenu);
    } catch {
      // ignore
    }
  }, [activeMenu]);

  // Real-time synchronization data pesanan & inventaris
  const [orders, setOrders] = useState(() => getStoredOrders() || []);
  const [drafts, setDrafts] = useState(() => getStoredDraftInvoices() || []);
  const [products, setProducts] = useState(() => getStoredProducts() || []);

  useStoreSync(['farmsight_orders_updated', 'farmsight_products_updated', 'farmsight_movements_updated'], () => {
    setOrders(getStoredOrders() || []);
    setDrafts(getStoredDraftInvoices() || []);
    setProducts(getStoredProducts() || []);
  });

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'qris' | 'proof' | 'verify' | 'detail'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metrik Kinerja Penjualan
  const metrics = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const totalOrders = safeOrders.length;
    const pendingPayment = safeOrders.filter((o) => o && o.status === 'MENUNGGU_PEMBAYARAN').length;
    const needVerification = safeOrders.filter((o) => o && o.status === 'SUDAH_BAYAR').length;
    const completedOrders = safeOrders.filter((o) => o && o.status === 'SELESAI');
    const completedCount = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o?.totalAmount || 0), 0);
    const needRetransfer = safeOrders.filter((o) => o && o.status === 'PERLU_TRANSFER_ULANG').length;
    const cancelledCount = safeOrders.filter((o) => o && o.status === 'DIBATALKAN').length;

    return {
      totalOrders,
      pendingPayment,
      needVerification,
      completedCount,
      totalRevenue,
      needRetransfer,
      cancelledCount,
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return safeOrders.filter((o) => {
      if (!o) return false;
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.productName && o.productName.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const totalBadgeCount = (Array.isArray(drafts) ? drafts.length : 0) + (metrics?.needVerification || 0);

  // Aksi Langsung: Kirim QRIS ke WhatsApp Customer (tanpa modal perantara)
  const handleSendQrisDirect = async (order) => {
    try {
      await copyQrisImage();
    } catch {
      // Fallback jika browser blokir clipboard
    }
    const waUrl = generateCustomerQrisWhatsAppUrl(order);
    window.open(waUrl, '_blank');
    markQrisSent(order.id);
    setOrders(getStoredOrders());
    showToast(`QRIS pembayaran untuk pesanan ${order.id} berhasil dikirim ke WhatsApp ${order.customerName}.`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8faf9', color: '#142019', display: 'flex', flexDirection: 'column' }}>
      {ToastComponent}

      {/* ======================================================== */}
      {/* 1. TOP NAVBAR / HEADER (TANPA SIDEBAR, NAVIGASI LENGKAP) */}
      {/* ======================================================== */}
      <header
        style={{
          height: '76px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8e3',
          padding: '0 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Left: Brand & Role Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/images/logo-farm-berkah.jpg"
            alt="Logo Toko Farm Berkah"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              objectFit: 'contain',
              border: '1px solid #d8e2da',
              boxShadow: '0 2px 6px rgba(27, 67, 50, 0.08)',
              backgroundColor: '#ffffff',
              padding: '2px',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#142019', letterSpacing: '-0.02em' }}>
                Toko Farm Berkah
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0',
                }}
              >
                Sales Admin
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#718277', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} color="#2d6a4f" />
              <span>Komplek Masnaga, Pulo Gebang</span>
            </div>
          </div>
        </div>

        {/* Center: Main Page Tabs (Pengganti Sidebar yang Bersih & Elegan) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f2', padding: '4px', borderRadius: '32px', border: '1px solid #d8e2da' }}>
          <button
            type="button"
            onClick={() => setActiveMenu('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'dashboard' ? '#1b4332' : 'transparent',
              color: activeMenu === 'dashboard' ? '#ffffff' : '#48564e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeMenu === 'dashboard' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard Penjualan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'orders' ? '#1b4332' : 'transparent',
              color: activeMenu === 'orders' ? '#ffffff' : '#48564e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeMenu === 'orders' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ShoppingCart size={15} />
            <span>Manajemen Pesanan</span>
            {totalBadgeCount > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backgroundColor: activeMenu === 'orders' ? '#52b788' : '#dc2626',
                  color: activeMenu === 'orders' ? '#081c15' : '#ffffff',
                  padding: '1px 7px',
                  borderRadius: '10px',
                }}
              >
                {totalBadgeCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right: Quick Actions, Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Tombol Lihat Katalog Staf */}
          <button
            type="button"
            onClick={onViewCatalog}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #bbf7d0',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dcfce7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f0fdf4';
            }}
            title="Buka Katalog Inventaris & Stok Produk Staf"
          >
            <Store size={15} />
            <span>Katalog Staf</span>
          </button>

          {/* User Profile Capsule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '5px 12px 5px 6px',
              borderRadius: '24px',
              backgroundColor: '#f8faf9',
              border: '1px solid #e2e8e3',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user?.avatar || (user?.name || 'S').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#142019', lineHeight: 1.2 }}>
                {user?.name || 'Siti Rahmawati'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#718277' }}>
                {user?.email || 'sales@farmberkah.com'}
              </span>
            </div>
          </div>

          {/* Tombol Keluar */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid #fecaca',
              backgroundColor: '#fff5f5',
              color: '#dc2626',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff5f5';
            }}
            title="Keluar dari Portal Sales Admin"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. BODY CONTENT: DASHBOARD vs MANAJEMEN PESANAN          */}
      {/* ======================================================== */}
      <main style={{ flex: 1, padding: '28px 40px 60px 40px', width: '100%', boxSizing: 'border-box' }}>

        {/* ======================================================== */}
        {/* TAB A. DASHBOARD RINGKASAN PENJUALAN                     */}
        {/* ======================================================== */}
        {activeMenu === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header Judul Tab */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                  Ringkasan Kinerja Penjualan Toko
                </h1>
              </div>
            </div>

            {/* 4 Kartu Angka Kinerja (Grid 4 Kolom Rapi & Proporsional) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '18px',
              }}
            >
              {/* Kartu 1: Total Pesanan */}
              <div
                onClick={() => setActiveMenu('orders')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8e3',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Pesanan Masuk</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={19} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#142019', letterSpacing: '-0.02em' }}>
                    {metrics.totalOrders}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#718277', marginTop: '2px' }}>
                    Semua transaksi yang tercatat
                  </div>
                </div>
              </div>

              {/* Kartu 2: Menunggu Pembayaran */}
              <div
                onClick={() => {
                  setStatusFilter('MENUNGGU_PEMBAYARAN');
                  setActiveMenu('orders');
                }}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8e3',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Menunggu Pembayaran</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={19} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#b45309', letterSpacing: '-0.02em' }}>
                    {metrics.pendingPayment}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#718277', marginTop: '2px' }}>
                    Menunggu transfer dari pelanggan
                  </div>
                </div>
              </div>

              {/* Kartu 3: Perlu Dicek (Gateway 2) */}
              <div
                onClick={() => {
                  setStatusFilter('SUDAH_BAYAR');
                  setActiveMenu('orders');
                }}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8e3',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Perlu Dicek (Bukti Masuk)</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={19} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1d4ed8', letterSpacing: '-0.02em' }}>
                    {metrics.needVerification}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#718277', marginTop: '2px' }}>
                    Verifikasi bukti transfer WhatsApp
                  </div>
                </div>
              </div>

              {/* Kartu 4: Total Omset Lunas */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8e3',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Omset Lunas</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#d1fae5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={19} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#047857', letterSpacing: '-0.02em' }}>
                    {formatRupiah(metrics.totalRevenue)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#718277', marginTop: '2px' }}>
                    {metrics.completedCount} pesanan selesai diverifikasi
                  </div>
                </div>
              </div>
            </div>



            {/* Alert Perlu Verifikasi Segera */}
            {metrics.needVerification > 0 && (
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderLeft: '5px solid #2563eb',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Receipt size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#1e40af' }}>
                      {metrics.needVerification} Pembayaran Membutuhkan Verifikasi Nominal
                    </strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#475569' }}>
                      Pelanggan telah mengunggah bukti transfer QRIS via WhatsApp. Cocokkan nominal untuk menyelesaikan pesanan dan memotong stok toko.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('SUDAH_BAYAR');
                    setActiveMenu('orders');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Verifikasi Pembayaran →
                </button>
              </div>
            )}

            {/* Pesan Masuk WhatsApp dari Customer (Banner Notifikasi Ringkas) */}
            {drafts.length > 0 && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderLeft: '5px solid #16a34a',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#166534' }}>
                      {drafts.length} Pesan WhatsApp Masuk dari Pelanggan ({drafts.length} Rincian Pesanan)
                    </strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#475569' }}>
                      Pelanggan mengirim rincian draft pesanan via WhatsApp. Klik tombol untuk mengecek stok toko dan memproses pesanan di Manajemen Pesanan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMenu('orders')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Input Pesanan di Manajemen Pesanan →
                </button>
              </div>
            )}

            {/* Tabel 5 Transaksi Terkini */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#142019' }}>
                    Transaksi Terkini Toko
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    5 pesanan terbaru yang sedang diproses di sistem
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMenu('orders')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2d6a4f',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Lihat Semua Pesanan</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                  <ShoppingCart size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Belum ada data transaksi toko.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8faf9', borderBottom: '1px solid #e2e8e3', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <th style={{ padding: '12px 10px', width: '18%', fontWeight: 700, textAlign: 'center' }}>No. Pesanan</th>
                        <th style={{ padding: '12px 10px', width: '22%', fontWeight: 700, textAlign: 'center' }}>Pelanggan</th>
                        <th style={{ padding: '12px 10px', width: '22%', fontWeight: 700, textAlign: 'center' }}>Produk</th>
                        <th style={{ padding: '12px 10px', width: '18%', fontWeight: 700, textAlign: 'center' }}>Total Tagihan</th>
                        <th style={{ padding: '12px 10px', width: '20%', fontWeight: 700, textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => {
                        const st = ORDER_STATUS[o.status] || { label: o.status, badge: 'badge-gray' };
                        return (
                          <tr
                            key={o.id}
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafcfb'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 800, color: '#1b4332', fontFamily: 'monospace' }}>
                              {o.id}
                            </td>
                            <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#142019' }}>{o.customerName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{o.customerPhone}</div>
                            </td>
                            <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 600, color: '#142019' }}>{o.productName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{formatQtyUnit(o.quantity, o.unit)}</div>
                            </td>
                            <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 800, color: '#1b4332' }}>
                              {formatRupiah(o.totalAmount)}
                            </td>
                            <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <span className={`badge ${st.badge}`} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                                  {st.label}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB B. MANAJEMEN PESANAN LENGKAP & ALUR GATEWAY          */}
        {/* ======================================================== */}
        {activeMenu === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Header Manajemen Pesanan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                  Manajemen Alur Pesanan & Verifikasi
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Tahap 1: Validasi stok toko & reservasi · Tahap 2: Verifikasi bukti transfer pembayaran QRIS
                </p>
              </div>
            </div>

            {/* Antrian Pesan Masuk WhatsApp (Jika Ada) */}
            {drafts.length > 0 && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '14px',
                  border: '1.5px solid #86efac',
                  padding: '18px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#166534" />
                    <strong style={{ fontSize: '0.92rem', color: '#166534' }}>
                      Antrian Pesan WhatsApp Masuk ({drafts.length} Draft Pesanan)
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
                    Pelanggan mengirim rincian via WA
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
                  {drafts.map((d) => (
                    <div
                      key={d.invoiceNo}
                      style={{
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '12px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{d.invoiceNo}</span>
                          <span>{d.date}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#142019', marginTop: '2px' }}>
                          {d.productName} ({formatQtyUnit(d.quantity, d.unit)})
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {d.customerName} · {d.customerPhone}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1b4332', marginTop: '2px' }}>
                          Tagihan: {formatRupiah(d.subtotal)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDraft(d);
                          setActiveModal('create');
                        }}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#1b4332',
                          color: '#ffffff',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Input Pesanan Ini →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Toolbar Pencarian */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Search Bar */}
                <div style={{ flex: '1 1 260px', maxWidth: '360px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Cari no pesanan, nama pembeli, produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d8e2da',
                      backgroundColor: '#f8faf9',
                      fontSize: '0.82rem',
                      color: '#142019',
                      outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1b4332';
                      e.target.style.boxShadow = '0 0 0 3px rgba(27, 67, 50, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d8e2da';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Status Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { id: 'ALL', label: 'Semua Status' },
                    { id: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Bayar' },
                    { id: 'SUDAH_BAYAR', label: 'Perlu Dicek (Bukti Masuk)' },
                    { id: 'PERLU_TRANSFER_ULANG', label: 'Transfer Ulang' },
                    { id: 'SELESAI', label: 'Lunas / Selesai' },
                  ].map((st) => {
                    const isSelected = statusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        style={{
                          padding: '7px 15px',
                          borderRadius: '20px',
                          border: isSelected ? '1px solid #1b4332' : '1px solid #d8e2da',
                          backgroundColor: isSelected ? '#1b4332' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(27, 67, 50, 0.18)' : '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tabel Utama Pesanan */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart size={32} />}
                  title={orders.length === 0 ? 'Belum Ada Pesanan Toko' : 'Tidak Ada Pesanan yang Cocok'}
                  description={
                    orders.length === 0
                      ? 'Daftar pesanan masih kosong. Menunggu pesan atau draft pesanan masuk dari WhatsApp pelanggan.'
                      : 'Coba ubah kata kunci pencarian atau ganti filter status di atas.'
                  }
                  action={null}
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '1000px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8faf9', borderBottom: '1px solid #e2e8e3', color: '#64748b', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <th style={{ padding: '11px 8px', width: '14%', fontWeight: 700, textAlign: 'center' }}>No. Pesanan</th>
                        <th style={{ padding: '11px 8px', width: '15%', fontWeight: 700, textAlign: 'center' }}>Pelanggan</th>
                        <th style={{ padding: '11px 8px', width: '15%', fontWeight: 700, textAlign: 'center' }}>Produk & Qty</th>
                        <th style={{ padding: '11px 8px', width: '13%', fontWeight: 700, textAlign: 'center' }}>Total Tagihan</th>
                        <th style={{ padding: '11px 8px', width: '14%', fontWeight: 700, textAlign: 'center' }}>Status Pesanan</th>
                        <th style={{ padding: '11px 8px', width: '14%', fontWeight: 700, textAlign: 'center' }}>Bukti Bayar WA</th>
                        <th style={{ padding: '11px 8px', width: '15%', fontWeight: 700, textAlign: 'center' }}>Aksi Proses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const st = ORDER_STATUS[o.status] || { label: o.status, badge: 'badge-gray' };

                        return (
                          <tr
                            key={o.id}
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafcfb'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, color: '#1b4332', fontFamily: 'monospace', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>{o.id}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                {o.date ? o.date.replace(',', ' ·') : o.createdAt?.slice(0, 10)}
                              </div>
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.83rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.customerName}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <Phone size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerPhone}</span>
                              </div>
                              {o.customerAddress && o.customerAddress !== '-' && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <MapPin size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                                  <span style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.customerAddress}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#142019', fontSize: '0.83rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.productName}</div>
                              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                {formatQtyUnit(o.quantity, o.unit)} @ {formatRupiah(o.unitPrice || o.price || (o.quantity ? Math.round(o.totalAmount / o.quantity) : 0))}
                              </div>
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, color: '#1b4332', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                {formatRupiah(o.totalAmount)}
                              </div>
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                                <span className={`badge ${st.badge}`} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                                  {st.label}
                                </span>
                                {o.stockReserved && (
                                  <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    Stok direservasi ({formatQtyUnit(o.quantity, o.unit)})
                                  </div>
                                )}
                                {o.cancellationReason && (
                                  <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                    {o.cancellationReason}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              {(o.paymentProofUrl || o.transferProofImage) && o.status !== 'PERLU_TRANSFER_ULANG' ? (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px',
                                    backgroundColor: '#dcfce7',
                                    color: '#15803d',
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    boxShadow: '0 1px 2px rgba(22, 101, 52, 0.08)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setActiveModal('verify');
                                  }}
                                  title="Bukti transfer telah berhasil diunggah. Klik untuk melihat verifikasi"
                                >
                                  <CheckCircle2 size={12} color="#16a34a" />
                                  <span>Bukti Diunggah</span>
                                </div>
                              ) : o.status === 'MENUNGGU_PEMBAYARAN' || o.status === 'PERLU_TRANSFER_ULANG' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setActiveModal('proof');
                                  }}
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: o.status === 'PERLU_TRANSFER_ULANG' ? '1.5px solid #f87171' : '1px solid #d8e2da',
                                    backgroundColor: o.status === 'PERLU_TRANSFER_ULANG' ? '#fef2f2' : '#f8faf9',
                                    color: o.status === 'PERLU_TRANSFER_ULANG' ? '#b91c1c' : '#1b4332',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={o.status === 'PERLU_TRANSFER_ULANG' ? 'Catat bukti transfer baru yang dikirim customer via WhatsApp' : 'Catat bukti transfer'}
                                >
                                  <Receipt size={12} />
                                  <span>Catat Bukti</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '12px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                {/* 1. Tahap Menunggu Pembayaran -> Langsung Kirim QRIS ke WA Customer */}
                                {o.status === 'MENUNGGU_PEMBAYARAN' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendQrisDirect(o)}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      backgroundColor: o.qrisSent ? '#166534' : '#1b4332',
                                      color: '#ffffff',
                                      fontSize: '0.73rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Kirim QRIS langsung ke WhatsApp customer"
                                  >
                                    <QrCode size={12} />
                                    <span>{o.qrisSent ? 'Kirim Ulang QRIS' : 'Kirim QRIS'}</span>
                                  </button>
                                )}

                                {/* 2. Tahap Sudah Bayar -> Verifikasi Pembayaran */}
                                {o.status === 'SUDAH_BAYAR' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setActiveModal('verify');
                                    }}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      backgroundColor: '#1d4ed8',
                                      color: '#ffffff',
                                      fontSize: '0.73rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 1px 3px rgba(29, 78, 216, 0.25)',
                                    }}
                                    title="Verifikasi Bukti Pembayaran"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Verifikasi</span>
                                  </button>
                                )}

                                {/* 3. Tahap Perlu Transfer Ulang */}
                                {o.status === 'PERLU_TRANSFER_ULANG' && (
                                  <button
                                    type="button"
                                    disabled={!o.newProofReceived}
                                    onClick={() => {
                                      if (!o.newProofReceived) {
                                        showToast('Catat bukti transfer baru terlebih dahulu via tombol "Catat Bukti" sebelum verifikasi ulang.', 'error');
                                        return;
                                      }
                                      setSelectedOrder(o);
                                      setActiveModal('verify');
                                    }}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      border: o.newProofReceived ? 'none' : '1px solid #cbd5e1',
                                      backgroundColor: o.newProofReceived ? '#dc2626' : '#f1f5f9',
                                      color: o.newProofReceived ? '#ffffff' : '#94a3b8',
                                      fontSize: '0.73rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: o.newProofReceived ? '0 1px 3px rgba(220, 38, 38, 0.25)' : 'none',
                                      opacity: o.newProofReceived ? 1 : 0.65,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={
                                      o.newProofReceived
                                        ? 'Verifikasi ulang bukti transfer baru'
                                        : 'Tombol nonaktif: Catat bukti transfer baru terlebih dahulu via tombol "Catat Bukti"'
                                    }
                                  >
                                    <RotateCcw size={12} />
                                    <span>Verifikasi Ulang</span>
                                  </button>
                                )}

                                {/* 4. Tahap Dibatalkan (Stok Tidak Cukup) -> Kirim info via WhatsApp */}
                                {o.status === 'DIBATALKAN' && (
                                  <a
                                    href={generateStockCancelledWhatsAppUrl(o, o.cancellationReason?.match(/Tersedia:\s*(\d+)/)?.[1] || 0)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fff1f2',
                                      color: '#be123c',
                                      fontSize: '0.73rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      textDecoration: 'none',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Kirim pesan pembatalan pesanan karena stok kosong ke WhatsApp pelanggan"
                                  >
                                    <MessageSquare size={12} />
                                    <span>Info Batal WA</span>
                                  </a>
                                )}

                                {/* Tombol Detail Lengkap - Hanya Muncul Jika Pesanan Sudah Lunas / Selesai */}
                                {o.status === 'SELESAI' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setActiveModal('detail');
                                    }}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #d8e2da',
                                      backgroundColor: '#ffffff',
                                      color: '#1b4332',
                                      fontSize: '0.73rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    }}
                                    title="Lihat Rincian Pesanan Lunas"
                                  >
                                    <Eye size={12} />
                                    <span>Detail</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* 3. MODAL-MODAL LENGKAP ALUR SALES ADMIN                  */}
      {/* ======================================================== */}

      {/* 1. Modal Input Pesanan Baru / Create Order (Gateway 1: Cek Stok) */}
      {activeModal === 'create' && (
        <FormInputPesanan
          draft={selectedDraft}
          onClose={() => {
            setActiveModal(null);
            setSelectedDraft(null);
          }}
          onCreated={() => {
            setActiveModal(null);
            setSelectedDraft(null);
            setOrders(getStoredOrders());
            setDrafts(getStoredDraftInvoices());
            setActiveMenu('orders');
          }}
          onToast={showToast}
        />
      )}

      {/* 2. Modal Kirim QR Code Pembayaran ke WA Customer */}
      {activeModal === 'qris' && selectedOrder && (
        <ModalKirimQris
          order={selectedOrder}
          onClose={() => {
            setActiveModal(null);
            setSelectedOrder(null);
          }}
          onToast={showToast}
        />
      )}

      {/* 3. Modal Catat Bukti Transfer dari WhatsApp */}
      {activeModal === 'proof' && selectedOrder && (
        <ModalCatatBukti
          order={selectedOrder}
          onClose={() => {
            setActiveModal(null);
            setSelectedOrder(null);
            setOrders(getStoredOrders());
          }}
          onToast={showToast}
        />
      )}

      {/* 4. Modal Gateway 2: Verifikasi Nominal & Konfirmasi Pesanan */}
      {activeModal === 'verify' && selectedOrder && (
        <ModalVerifikasi
          order={selectedOrder}
          onClose={() => {
            setActiveModal(null);
            setSelectedOrder(null);
            setOrders(getStoredOrders());
          }}
          onToast={showToast}
          onConfirmed={() => {
            setOrders(getStoredOrders());
          }}
        />
      )}

      {/* 5. Modal Detail Lengkap Pesanan */}
      {activeModal === 'detail' && selectedOrder && (
        <ModalDetailPesanan
          order={selectedOrder}
          onClose={() => {
            setActiveModal(null);
            setSelectedOrder(null);
          }}
        />
      )}

    </div>
  );
}
