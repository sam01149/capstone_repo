import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  Users,
  LogOut,
  ExternalLink,
  CheckCircle2,
  ShoppingCart,
  Boxes,
  ArrowRight,
  Plus,
  AlertTriangle,
  Search,
  X,
  RotateCcw,
  Filter,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStoredProducts, formatRupiah } from '../data/productsData';
import { getStoredOrders, getStoredMovements } from '../data/ordersAndInventoryData';

import ManajemenAkun from './ManajemenAkun';
import ManajemenProduk from './ManajemenProduk';

export default function DashboardSuperAdmin({ onLogout, onViewCatalog }) {
  const { user, users = [] } = useAuth();

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [orders, setOrders] = useState(getStoredOrders);
  const [movements, setMovements] = useState(getStoredMovements);
  const [toastMsg, setToastMsg] = useState('');

  // Navigasi Utama: 'dashboard' | 'users' (Manajemen Akun) | 'products' (Manajemen Produk)
  // Dilengkapi persistensi sessionStorage agar saat di-refresh tetap di tab yang sedang aktif
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem('super_admin_active_tab');
      return ['dashboard', 'users', 'products'].includes(saved) ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('super_admin_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  // State jembatan aksi cepat ke sub-page
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [prodViewMode, setProdViewMode] = useState('list');

  // Filter & Pencarian Pesanan di Dashboard untuk Super Admin
  const [salesOrderSearch, setSalesOrderSearch] = useState('');
  const [salesOrderStatusFilter, setSalesOrderStatusFilter] = useState('ALL');

  // Sinkronisasi data real-time
  useEffect(() => {
    const syncAll = () => {
      setProducts(getStoredProducts());
      setOrders(getStoredOrders());
      setMovements(getStoredMovements());
    };
    window.addEventListener('storage', syncAll);
    window.addEventListener('farmsight_products_updated', syncAll);
    window.addEventListener('farmsight_orders_updated', syncAll);
    window.addEventListener('farmsight_movements_updated', syncAll);
    const interval = setInterval(syncAll, 1500);
    return () => {
      window.removeEventListener('storage', syncAll);
      window.removeEventListener('farmsight_products_updated', syncAll);
      window.removeEventListener('farmsight_orders_updated', syncAll);
      window.removeEventListener('farmsight_movements_updated', syncAll);
      clearInterval(interval);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const userInitial = user?.name
    ? user.name
      .replace(/^Ibu\s+/i, '')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'IP';

  const userRoleText = (() => {
    const r = String(user?.role || '').toUpperCase();
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    if (r === 'STOCK_MANAGER') return 'Stock Manager';
    if (r === 'SALES_ADMIN') return 'Sales Admin';
    if (user?.roleTitle && ['Super Admin', 'Stock Manager', 'Sales Admin'].includes(user.roleTitle)) {
      return user.roleTitle;
    }
    return 'Super Admin';
  })();

  // Perhitungan Data Dashboard
  const safeUsers = Array.isArray(users) ? users : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeMovements = Array.isArray(movements) ? movements : [];

  // Hanya pantau pesanan aktif (kecualikan yang dibatalkan)
  const activeOrders = safeOrders.filter((o) => o && o.status !== 'DIBATALKAN');

  const completedOrders = activeOrders.filter((o) => o && (o.status === 'SELESAI' || o.gateway2Status === 'LOLOS'));
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingVerificationOrders = activeOrders.filter((o) => o && o.status === 'SUDAH_BAYAR');
  const pendingPaymentOrders = activeOrders.filter((o) => o && o.status === 'MENUNGGU_PEMBAYARAN');
  const retransferOrders = activeOrders.filter((o) => o && o.status === 'PERLU_TRANSFER_ULANG');

  // Filter dinamis pesanan untuk pemantauan Super Admin
  const filteredSalesOrders = activeOrders.filter((o) => {
    if (!o) return false;
    if (salesOrderStatusFilter !== 'ALL') {
      if (salesOrderStatusFilter === 'SELESAI') {
        if (o.status !== 'SELESAI' && o.gateway2Status !== 'LOLOS') return false;
      } else if (salesOrderStatusFilter === 'SUDAH_BAYAR') {
        if (o.status !== 'SUDAH_BAYAR') return false;
      } else if (salesOrderStatusFilter === 'MENUNGGU_PEMBAYARAN') {
        if (o.status !== 'MENUNGGU_PEMBAYARAN' && o.status !== 'MENUNGGU_BAYAR') return false;
      } else if (salesOrderStatusFilter === 'PERLU_TRANSFER_ULANG') {
        if (o.status !== 'PERLU_TRANSFER_ULANG') return false;
      } else if (o.status !== salesOrderStatusFilter) {
        return false;
      }
    }
    if (salesOrderSearch.trim()) {
      const q = salesOrderSearch.toLowerCase();
      const matchId = String(o.id || '').toLowerCase().includes(q);
      const matchCust = String(o.customerName || '').toLowerCase().includes(q);
      const matchPhone = String(o.customerPhone || '').toLowerCase().includes(q);
      const matchProd = String(o.productName || '').toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchPhone && !matchProd) return false;
    }
    return true;
  });

  const criticalStockProducts = safeProducts.filter(
    (p) => Number(p.stock || 0) <= Number(p.reorderPoint || p.minStock || 15)
  );
  const safeStockProducts = safeProducts.filter(
    (p) => Number(p.stock || 0) > Number(p.reorderPoint || p.minStock || 15)
  );
  const visibleProductsCount = safeProducts.filter((p) => p.visibility !== 'hidden').length;
  const hiddenProductsCount = safeProducts.filter((p) => p.visibility === 'hidden').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f4' }}>
      {/* Top Header Super Admin (Persis Mengikuti Desain Header Sales Admin yang Rapi & Elegan) */}
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
                Super Admin
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#718277', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} color="#2d6a4f" />
              <span>Komplek Masnaga, Pulo Gebang</span>
            </div>
          </div>
        </div>

        {/* Center: Main Page Tabs Capsule (Desain Kapsul Elegan Seperti Sales Admin) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f2', padding: '4px', borderRadius: '32px', border: '1px solid #d8e2da' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setProdViewMode('list');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeTab === 'dashboard' ? '#1b4332' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : '#48564e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              setProdViewMode('list');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeTab === 'users' ? '#1b4332' : 'transparent',
              color: activeTab === 'users' ? '#ffffff' : '#48564e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'users' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={15} />
            <span>Manajemen Akun</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                backgroundColor: activeTab === 'users' ? '#52b788' : '#e2e8f0',
                color: activeTab === 'users' ? '#081c15' : '#48564e',
                padding: '1px 7px',
                borderRadius: '10px',
              }}
            >
              {safeUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('products');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeTab === 'products' ? '#1b4332' : 'transparent',
              color: activeTab === 'products' ? '#ffffff' : '#48564e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'products' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PackageSearch size={15} />
            <span>Manajemen Produk</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                backgroundColor: activeTab === 'products' ? '#52b788' : '#e2e8f0',
                color: activeTab === 'products' ? '#081c15' : '#48564e',
                padding: '1px 7px',
                borderRadius: '10px',
              }}
            >
              {safeProducts.length}
            </span>
          </button>
        </nav>

        {/* Right: Quick Actions, Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Tombol Lihat Katalog */}
          {onViewCatalog && (
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
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dcfce7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0fdf4';
              }}
              title="Buka Pratinjau Katalog Publik Toko Farm Berkah"
            >
              <ExternalLink size={15} />
              <span>Lihat Katalog</span>
            </button>
          )}

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
              {userInitial}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#142019', lineHeight: 1.2 }}>
                {user?.name || 'Ibu Intan Permatasari'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>
                {userRoleText} (Pemilik)
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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff5f5';
            }}
            title="Keluar dari Portal Super Admin"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container - Full Layar untuk Semua Page */}
      <main style={{ width: '100%', maxWidth: '100%', padding: '24px 32px 60px', boxSizing: 'border-box' }}>
        {/* Toast Notifikasi Sukses / Info */}
        {toastMsg && (
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
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.08)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>{typeof toastMsg === 'string' ? toastMsg.replace(/^[✓✔]\s*/, '') : toastMsg}</span>
          </div>
        )}

        {/* 1. HALAMAN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Banner Sambutan Super Admin */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', backgroundColor: '#d8f3dc', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Akses Hak Pemilik Toko (Super Admin)
                </span>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: '8px 0 4px 0' }}>
                  Selamat Datang, {user?.name || 'Ibu Intan Permatasari'} 👋
                </h1>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                  Sebagai Pemilik Toko, Anda dapat memantau kinerja operasional <strong>Sales Admin (Penjualan)</strong> dan <strong>Stock Manager (Gudang)</strong> secara terintegrasi, serta mengelola <strong>Akun Staf</strong> dan <strong>Katalog Produk</strong>.
                </p>
              </div>
            </div>

            {/* DUA KARTU PILIHAN UTAMA: MANAJEMEN AKUN & MANAJEMEN PRODUK */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* KARTU PILIHAN 1: MANAJEMEN AKUN */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #bbf7d0',
                  padding: '22px 24px',
                  boxShadow: '0 4px 12px rgba(22, 101, 52, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e8f5e9', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={24} />
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                      {safeUsers.length} Akun Staf
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#142019', margin: '0 0 6px 0' }}>
                    Manajemen Akun & Role
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                    Kelola data staf toko dengan 2 aksi utama: <strong>Input Data Akun Baru & Role</strong> serta <strong>Reset Kata Sandi Staf</strong>.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#1b4332',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(27, 67, 50, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Pilih Manajemen Akun</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* KARTU PILIHAN 2: MANAJEMEN PRODUK */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #bfdbfe',
                  padding: '22px 24px',
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PackageSearch size={24} />
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                      {safeProducts.length} Produk Toko
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#142019', margin: '0 0 6px 0' }}>
                    Manajemen Produk
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                    Kelola produk UMKM Toko Farm Berkah: <strong>Tambah Produk Baru</strong>, <strong>Edit Data Produk</strong>, serta <strong>Ubah Visibilitas Publik</strong> (tampilkan atau sembunyikan dari katalog).
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#1e40af',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(30, 64, 175, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Pilih Manajemen Produk</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* BAGIAN PEMANTAUAN 1: OPERASIONAL SALES ADMIN */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Pemantauan Penjualan & Alur Pesanan (Sales Admin)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Ringkasan pendapatan lunas dan status alur transaksi yang diproses oleh Sales Admin
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                  Aktivitas Meja Kerja Sales Admin
                </span>
              </div>

              {/* 4 Kartu KPI Penjualan (Interaktif Filter) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div
                  onClick={() => setSalesOrderStatusFilter(salesOrderStatusFilter === 'SELESAI' ? 'ALL' : 'SELESAI')}
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: '12px',
                    border: salesOrderStatusFilter === 'SELESAI' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: salesOrderStatusFilter === 'SELESAI' ? '0 4px 12px rgba(22, 163, 74, 0.18)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title="Klik untuk memfilter pesanan Lunas · Selesai"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Total Omzet Lunas</div>
                    {salesOrderStatusFilter === 'SELESAI' && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#16a34a', color: '#ffffff' }}>Filter Aktif</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', marginTop: '4px', letterSpacing: '-0.02em' }}>
                    {formatRupiah(totalRevenue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {completedOrders.length} transaksi selesai terverifikasi
                  </div>
                </div>

                <div
                  onClick={() => setSalesOrderStatusFilter(salesOrderStatusFilter === 'SUDAH_BAYAR' ? 'ALL' : 'SUDAH_BAYAR')}
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    border: salesOrderStatusFilter === 'SUDAH_BAYAR' ? '2px solid #2563eb' : '1px solid #bfdbfe',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: salesOrderStatusFilter === 'SUDAH_BAYAR' ? '0 4px 12px rgba(37, 99, 235, 0.18)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title="Klik untuk memfilter pesanan yang perlu dicek bukti transfernya"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>Perlu Dicek (Bukti Masuk)</div>
                    {salesOrderStatusFilter === 'SUDAH_BAYAR' && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#2563eb', color: '#ffffff' }}>Filter Aktif</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e40af', marginTop: '4px' }}>
                    {pendingVerificationOrders.length} Pesanan
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Menunggu verifikasi bukti transfer WhatsApp
                  </div>
                </div>

                <div
                  onClick={() => setSalesOrderStatusFilter(salesOrderStatusFilter === 'MENUNGGU_PEMBAYARAN' ? 'ALL' : 'MENUNGGU_PEMBAYARAN')}
                  style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: '12px',
                    border: salesOrderStatusFilter === 'MENUNGGU_PEMBAYARAN' ? '2px solid #d97706' : '1px solid #fde68a',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: salesOrderStatusFilter === 'MENUNGGU_PEMBAYARAN' ? '0 4px 12px rgba(217, 119, 6, 0.18)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title="Klik untuk memfilter pesanan yang masih menunggu pembayaran pelanggan"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Menunggu Pembayaran</div>
                    {salesOrderStatusFilter === 'MENUNGGU_PEMBAYARAN' && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#d97706', color: '#ffffff' }}>Filter Aktif</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
                    {pendingPaymentOrders.length} Pesanan
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Menunggu transfer dari pelanggan
                  </div>
                </div>

                <div
                  onClick={() => setSalesOrderStatusFilter(salesOrderStatusFilter === 'PERLU_TRANSFER_ULANG' ? 'ALL' : 'PERLU_TRANSFER_ULANG')}
                  style={{
                    backgroundColor: '#fdf2f8',
                    borderRadius: '12px',
                    border: salesOrderStatusFilter === 'PERLU_TRANSFER_ULANG' ? '2px solid #db2777' : '1px solid #fbcfe8',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: salesOrderStatusFilter === 'PERLU_TRANSFER_ULANG' ? '0 4px 12px rgba(219, 39, 119, 0.18)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title="Klik untuk memfilter pesanan yang perlu transfer ulang karena nominal tidak cocok"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#be185d', fontWeight: 700, textTransform: 'uppercase' }}>Perlu Transfer Ulang</div>
                    {salesOrderStatusFilter === 'PERLU_TRANSFER_ULANG' && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#db2777', color: '#ffffff' }}>Filter Aktif</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#9d174d', marginTop: '4px' }}>
                    {retransferOrders.length} Pesanan
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Nominal struk belum sesuai tagihan
                  </div>
                </div>
              </div>

              {/* Tabel Pesanan Terkini dengan Bar Filter Lengkap */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#142019' }}>
                      Daftar Pesanan di Sistem
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Menampilkan {filteredSalesOrders.length} dari {activeOrders.length} pesanan
                    </span>
                  </div>

                  {/* Filter Controls: Search Input & Dropdown Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', minWidth: '220px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        value={salesOrderSearch}
                        onChange={(e) => setSalesOrderSearch(e.target.value)}
                        placeholder="Cari no. order, pelanggan, produk..."
                        style={{
                          width: '100%',
                          height: '32px',
                          padding: '0 26px 0 30px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          outline: 'none',
                        }}
                      />
                      {salesOrderSearch && (
                        <button
                          type="button"
                          onClick={() => setSalesOrderSearch('')}
                          style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <select
                      value={salesOrderStatusFilter}
                      onChange={(e) => setSalesOrderStatusFilter(e.target.value)}
                      style={{
                        height: '32px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#334155',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="ALL">Semua Status ({activeOrders.length})</option>
                      <option value="SUDAH_BAYAR">🔵 Perlu Dicek / Bukti Masuk ({pendingVerificationOrders.length})</option>
                      <option value="MENUNGGU_PEMBAYARAN">🟡 Menunggu Pembayaran ({pendingPaymentOrders.length})</option>
                      <option value="PERLU_TRANSFER_ULANG">🔴 Perlu Transfer Ulang ({retransferOrders.length})</option>
                      <option value="SELESAI">🟢 Lunas · Selesai ({completedOrders.length})</option>
                    </select>

                    {(salesOrderSearch || salesOrderStatusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSalesOrderSearch('');
                          setSalesOrderStatusFilter('ALL');
                        }}
                        style={{
                          height: '32px',
                          padding: '0 8px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Reset semua filter"
                      >
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8e3', color: '#64748b', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <th style={{ padding: '10px 8px', width: '18%', fontWeight: 700 }}>No. Pesanan</th>
                        <th style={{ padding: '10px 8px', width: '22%', fontWeight: 700 }}>Pelanggan</th>
                        <th style={{ padding: '10px 8px', width: '22%', fontWeight: 700 }}>Produk & Qty</th>
                        <th style={{ padding: '10px 8px', width: '18%', fontWeight: 700 }}>Total Tagihan</th>
                        <th style={{ padding: '10px 8px', width: '20%', fontWeight: 700 }}>Status Alur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSalesOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#334155' }}>Tidak ada pesanan yang sesuai filter</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#94a3b8' }}>Silakan sesuaikan kata kunci atau ubah filter status</div>
                          </td>
                        </tr>
                      ) : (
                        filteredSalesOrders.map((o) => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '11px 8px', verticalAlign: 'middle', fontWeight: 800, color: '#1b4332', fontFamily: 'monospace' }}>
                              {o.id}
                            </td>
                            <td style={{ padding: '11px 8px', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{o.customerName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{o.customerPhone}</div>
                            </td>
                            <td style={{ padding: '11px 8px', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 600, color: '#142019' }}>{o.productName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{o.quantity} unit</div>
                            </td>
                            <td style={{ padding: '11px 8px', verticalAlign: 'middle', fontWeight: 800, color: '#1b4332' }}>
                              {formatRupiah(o.totalAmount)}
                            </td>
                            <td style={{ padding: '11px 8px', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  backgroundColor:
                                    o.status === 'SELESAI'
                                      ? '#dcfce7'
                                      : o.status === 'SUDAH_BAYAR'
                                        ? '#dbeafe'
                                        : o.status === 'PERLU_TRANSFER_ULANG'
                                          ? '#fee2e2'
                                          : '#fef3c7',
                                  color:
                                    o.status === 'SELESAI'
                                      ? '#15803d'
                                      : o.status === 'SUDAH_BAYAR'
                                        ? '#1e40af'
                                        : o.status === 'PERLU_TRANSFER_ULANG'
                                          ? '#dc2626'
                                          : '#b45309',
                                }}
                              >
                                {o.status === 'SELESAI'
                                  ? 'Lunas · Selesai'
                                  : o.status === 'SUDAH_BAYAR'
                                    ? 'Sudah Bayar · Dicek'
                                    : o.status === 'PERLU_TRANSFER_ULANG'
                                      ? 'Transfer Ulang'
                                      : o.status === 'DIBATALKAN'
                                        ? 'Dibatalkan'
                                        : 'Menunggu Bayar'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* BAGIAN PEMANTAUAN 2: OPERASIONAL STOCK MANAGER */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Boxes size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Pemantauan Inventaris & Gudang (Stock Manager)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Ketersediaan persediaan fisik, peringatan batas Reorder Point (ROP), dan riwayat mutasi gudang
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                  Aktivitas Meja Kerja Stock Manager
                </span>
              </div>

              {/* 4 Kartu KPI Inventaris */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Item Produk</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {products.length} SKU
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {visibleProductsCount} publik &bull; {hiddenProductsCount} tersembunyi
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '16px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Stok Fisik Aman</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    {safeStockProducts.length} Produk
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
                    ✓ Kuantitas berada di atas batas ROP
                  </div>
                </div>

                <div style={{ backgroundColor: criticalStockProducts.length > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '12px', border: criticalStockProducts.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.74rem', color: criticalStockProducts.length > 0 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Peringatan Perlu Restock</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: criticalStockProducts.length > 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                    {criticalStockProducts.length} Produk
                  </div>
                  <div style={{ fontSize: '0.72rem', color: criticalStockProducts.length > 0 ? '#b91c1c' : '#64748b', marginTop: '2px' }}>
                    {criticalStockProducts.length > 0 ? '⚠️ Menyentuh / di bawah batas ROP' : '✓ Tidak ada stok kritis'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Riwayat Mutasi Gudang</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {safeMovements.length} Catatan
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Aktivitas masuk & keluar tercatat
                  </div>
                </div>
              </div>

              {/* Grid 2 Kolom Rincian Gudang: Kritis ROP & Mutasi Terkini */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                {/* Kolom Kiri: Produk Perlu Restock (ROP Alert) */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} color={criticalStockProducts.length > 0 ? '#dc2626' : '#15803d'} />
                      <strong style={{ fontSize: '0.84rem', color: '#142019' }}>
                        Peringatan Reorder Point (ROP)
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Ambang batas restock gudang
                    </span>
                  </div>

                  {criticalStockProducts.length === 0 ? (
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#15803d', border: '1px solid #dcfce7' }}>
                      <CheckCircle2 size={24} style={{ margin: '0 auto 6px auto' }} />
                      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Seluruh Stok Produk Aman</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Tidak ada produk yang menyentuh batas kritis ROP saat ini.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {criticalStockProducts.slice(0, 4).map((p) => {
                        const rop = p.reorderPoint || p.minStock || 15;
                        return (
                          <div
                            key={p.id}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              border: '1px solid #fecaca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                SKU: {p.id} &bull; Batas ROP: {rop} {p.unit}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#dc2626' }}>
                                {p.stock} {p.unit}
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                ⚠️ Perlu Restock
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Kolom Kanan: Log Mutasi Gudang Terkini */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '0.84rem', color: '#142019' }}>
                      Mutasi Stok Terkini (Gudang)
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Aktivitas IN / OUT
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {safeMovements.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                            {m.productName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {m.date} &bull; {m.reference || m.category}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: m.type === 'IN' ? '#dcfce7' : '#fee2e2',
                              color: m.type === 'IN' ? '#15803d' : '#dc2626',
                            }}
                          >
                            {m.type === 'IN' ? `↓ +${m.quantity}` : `↑ ${m.quantity}`}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            Sisa: {m.remainingStock} unit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. HALAMAN MANAJEMEN AKUN */}
        {activeTab === 'users' && (
          <ManajemenAkun
            showToast={showToast}
            isAddUserModalOpen={isAddUserModalOpen}
            setIsAddUserModalOpen={setIsAddUserModalOpen}
          />
        )}

        {/* 3. HALAMAN MANAJEMEN PRODUK */}
        {activeTab === 'products' && (
          <ManajemenProduk
            products={products}
            setProducts={setProducts}
            showToast={showToast}
            prodViewMode={prodViewMode}
            setProdViewMode={setProdViewMode}
          />
        )}
      </main>
    </div>
  );
}
