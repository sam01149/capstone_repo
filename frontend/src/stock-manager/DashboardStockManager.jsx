import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Package,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  LogOut,
  ExternalLink,
  Store,
  Layers,
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStoredProducts, saveStoredProducts, formatRupiah, formatStockUnit } from '../data/productsData';
import {
  getStoredMovements,
  saveStoredMovements,
  getStoredForecasts,
  saveStoredForecasts,
} from '../data/ordersAndInventoryData';

// Import Halaman Aktivitas Sesuai Alur Flowchart Pengguna
import BarangMasuk from './BarangMasuk';
import BarangKeluar from './BarangKeluar';
import AnalisisForecast from './AnalisisForecast';

export default function DashboardStockManager({ onLogout, onViewCatalog }) {
  const { user } = useAuth();

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [movements, setMovements] = useState(getStoredMovements);
  const [forecasts, setForecasts] = useState(getStoredForecasts);
  const [successToast, setSuccessToast] = useState('');

  // Navigasi Tab Sesuai Alur:
  // 'dashboard' (Dashboard Utama) | 'barang-masuk' | 'barang-keluar' | 'analisis-forecast'
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      const saved = sessionStorage.getItem('stock_manager_active_tab');
      return ['dashboard', 'barang-masuk', 'barang-keluar', 'analisis-forecast'].includes(saved)
        ? saved
        : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('stock_manager_active_tab', activeMenu);
    } catch {
      // ignore
    }
  }, [activeMenu]);

  // Sinkronisasi data real-time jika ada perubahan dari tab atau Sales Admin
  useEffect(() => {
    // Pastikan data mutasi terbaru dan terfilter
    setMovements(getStoredMovements());
    const handleStorageChange = () => {
      setProducts(getStoredProducts());
      setMovements(getStoredMovements());
      setForecasts(getStoredForecasts());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Handler update data inventaris
  const handleSaveProducts = (newProducts) => {
    setProducts(newProducts);
    saveStoredProducts(newProducts);
  };

  const handleSaveMovements = (newMovements) => {
    setMovements(newMovements);
    saveStoredMovements(newMovements);
  };

  const handleSaveForecasts = (newForecasts) => {
    setForecasts(newForecasts);
    saveStoredForecasts(newForecasts);
  };

  // Export Laporan Persediaan Resmi (.CSV)
  const handleExportReport = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const csvRows = [
      ['KODE SKU', 'NAMA PRODUK', 'KATEGORI', 'STOK FISIK', 'SATUAN', 'MIN STOCK', 'SAFETY STOCK', 'REORDER POINT (ROP)', 'STATUS ROP', 'NILAI ASET (RP)'],
      ...products.map((p) => {
        const rop = p.reorderPoint || p.minStock || 15;
        const ss = p.safetyStock || Math.round(rop * 0.5);
        const statusRop = (p.stock || 0) <= rop ? 'PERLU RESTOCK' : 'STOK AMAN';
        const assetValue = (p.price || 0) * (p.stock || 0);
        return [p.id, p.name, p.category, p.stock, p.unit, p.minStock, ss, rop, statusRop, assetValue];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan-Persediaan-TokoFarmBerkah-${nowStr}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast('Laporan Persediaan berhasil di-generate dan diunduh!');
  };

  // Metrik ROP & Health Index
  const totalSku = products.length;
  const restockItems = products.filter((p) => {
    const rop = p.reorderPoint || p.minStock || 15;
    return (p.stock || 0) <= rop;
  });
  const needRestockCount = restockItems.length;
  const safeStockCount = totalSku - needRestockCount;

  // Filter tabel inventori di dashboard
  const [stockSearch, setStockSearch] = useState('');
  const [ropFilter, setRopFilter] = useState('ALL');

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(stockSearch.toLowerCase());
    const rop = p.reorderPoint || p.minStock || 15;
    const isRestock = (p.stock || 0) <= rop;
    const matchRop =
      ropFilter === 'ALL' ||
      (ropFilter === 'RESTOCK' && isRestock) ||
      (ropFilter === 'SAFE' && !isRestock);
    return matchSearch && matchRop;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8faf9', display: 'flex', flexDirection: 'column', color: '#142019' }}>
      {/* =========================================================================
          1. HEADER IDENTIK DENGAN SUPER ADMIN & SALES ADMIN (HEIGHT: 76PX)
      ========================================================================= */}
      <header
        style={{
          height: '76px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Left: Brand Logo & Role Identity */}
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
                Stock Manager
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#718277', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} color="#2d6a4f" />
              <span>Komplek Masnaga, Pulo Gebang</span>
            </div>
          </div>
        </div>

        {/* Center: Main Page Tabs Kapsul Elegan */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#f1f5f2',
            padding: '4px',
            borderRadius: '32px',
            border: '1px solid #d8e2da',
            margin: '0 28px',
            flexShrink: 0,
          }}
        >
          {/* Tab 1: Dashboard Utama */}
          <button
            type="button"
            onClick={() => setActiveMenu('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'dashboard' ? '#1b4332' : 'transparent',
              color: activeMenu === 'dashboard' ? '#ffffff' : '#48564e',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeMenu === 'dashboard' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard Stok</span>
          </button>

          {/* Tab 2: Barang Masuk */}
          <button
            type="button"
            onClick={() => setActiveMenu('barang-masuk')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'barang-masuk' ? '#1b4332' : 'transparent',
              color: activeMenu === 'barang-masuk' ? '#ffffff' : '#48564e',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeMenu === 'barang-masuk' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownLeft size={14} />
            <span>Barang Masuk</span>
          </button>

          {/* Tab 3: Barang Keluar */}
          <button
            type="button"
            onClick={() => setActiveMenu('barang-keluar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'barang-keluar' ? '#1b4332' : 'transparent',
              color: activeMenu === 'barang-keluar' ? '#ffffff' : '#48564e',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeMenu === 'barang-keluar' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight size={14} />
            <span>Barang Keluar</span>
          </button>

          {/* Tab 4: Analisis Forecast */}
          <button
            type="button"
            onClick={() => setActiveMenu('analisis-forecast')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: activeMenu === 'analisis-forecast' ? '#1b4332' : 'transparent',
              color: activeMenu === 'analisis-forecast' ? '#ffffff' : '#48564e',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeMenu === 'analisis-forecast' ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <TrendingUp size={14} />
            <span>Analisis Forecast</span>
          </button>
        </nav>

        {/* Right: Quick Actions, Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: 'auto' }}>
          {/* Tombol Lihat Katalog Staf */}
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
              BS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#142019', lineHeight: 1.2 }}>
                {user?.name || 'Budi Santoso'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#718277' }}>
                {user?.email || 'stock@farmberkah.com'}
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
            title="Keluar dari Portal Stock Manager"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* TOAST NOTIFIKASI BERHASIL */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1b4332',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 100,
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #86efac',
          }}
        >
          <CheckCircle2 size={18} color="#86efac" />
          <span>{typeof successToast === 'string' ? successToast.replace(/^[✓✔]\s*/, '') : successToast}</span>
        </div>
      )}

      {/* =========================================================================
          2. BODY CONTENT: SATU DASHBOARD & HALAMAN AKTIVITAS TERKAIT
      ========================================================================= */}
      <main style={{ flex: 1, padding: '28px 40px 60px 40px', width: '100%', boxSizing: 'border-box' }}>
        {/* =====================================================================
            A. DASHBOARD UTAMA (INVENTORY DASHBOARD TERINTEGRASI)
        ===================================================================== */}
        {activeMenu === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* TOMBOL AKSES CEPAT HALAMAN AKTIVITAS OPERASIONAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* TOMBOL 1: BARANG MASUK */}
              <button
                type="button"
                onClick={() => setActiveMenu('barang-masuk')}
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(27, 67, 50, 0.16)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#143326';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1b4332';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowDownLeft size={18} />
                  <span>Buka Halaman Barang Masuk</span>
                </div>
                <ArrowRight size={16} />
              </button>

              {/* TOMBOL 2: BARANG KELUAR */}
              <button
                type="button"
                onClick={() => setActiveMenu('barang-keluar')}
                style={{
                  backgroundColor: '#c2410c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(194, 65, 12, 0.16)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9a3412';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#c2410c';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowUpRight size={18} />
                  <span>Buka Halaman Barang Keluar</span>
                </div>
                <ArrowRight size={16} />
              </button>

              {/* TOMBOL 3: ANALISIS FORECAST */}
              <button
                type="button"
                onClick={() => setActiveMenu('analisis-forecast')}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.16)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0369a1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0284c7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={18} />
                  <span>Buka Halaman Analisis Forecast</span>
                </div>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 4 KARTU METRIK ANGKA KINERJA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total SKU Terdaftar</span>
                  <Package size={20} color="#2d6a4f" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#142019' }}>{totalSku} Produk</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Terintegrasi katalog toko</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>Perlu Restock Segera</span>
                  <AlertTriangle size={20} color="#ea580c" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#c2410c' }}>{needRestockCount} Produk</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9a3412' }}>Stok ≤ Reorder Point (ROP)</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Kondisi Stok Aman</span>
                  <CheckCircle2 size={20} color="#16a34a" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d' }}>{safeStockCount} Produk</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#166534' }}>Di atas ambang batas aman</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total Mutasi Tercatat</span>
                  <Clock size={20} color="#0284c7" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#142019' }}>{movements.length} Transaksi</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Masuk, Keluar, dan Sales</p>
              </div>
            </div>

            {/* SEKSI ALERT REORDER POINT (ROP) */}
            {needRestockCount > 0 && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '2px solid #fcd34d',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#92400e' }}>
                        Peringatan ROP: {needRestockCount} Produk Membutuhkan Reorder Segera!
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#b45309' }}>
                        Stok fisik saat ini telah menyentuh atau berada di bawah Reorder Point (ROP). Segera lakukan penambahan stok pada Aktivitas Barang Masuk.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveMenu('barang-masuk')}
                    style={{
                      backgroundColor: '#b45309',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Restock Sekarang di Barang Masuk <ArrowRight size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {restockItems.map((item) => {
                    const rop = item.reorderPoint || item.minStock || 15;
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#92400e', fontSize: '14px' }}>{item.name}</div>
                          <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                            Stok: <strong style={{ color: '#dc2626' }}>{formatStockUnit(item.stock, item.unit)}</strong> (ROP: {formatStockUnit(rop, item.unit)})
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                          }}
                        >
                          Perlu Restock
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABEL PEMANTAUAN PARAMETER INVENTORI & FORECAST ARIMA / CROSTON SBA */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8e3', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#142019' }}>
                    Tabel Pemantauan Parameter Inventori, Safety Stock & Demand Forecast
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Cari nama atau SKU..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <select
                    value={ropFilter}
                    onChange={(e) => setRopFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">Semua Status ROP</option>
                    <option value="RESTOCK">Perlu Restock Segera</option>
                    <option value="SAFE">Kondisi Stok Aman</option>
                  </select>

                  <button
                    onClick={handleExportReport}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#1b4332',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    Export Laporan
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                <span>Menampilkan <strong>{filteredProducts.length}</strong> dari {products.length} produk katalog</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ width: '14.28%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>SKU & NAMA PRODUK</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>KATEGORI</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>STOK FISIK</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>SAFETY STOCK</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>REORDER POINT (ROP)</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>STATUS ROP</th>
                      <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>METODE MODEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const rop = p.reorderPoint || p.minStock || 15;
                      const ss = p.safetyStock || Math.round(rop * 0.5);
                      const isRestock = (p.stock || 0) <= rop;
                      const isIntermittent = (p.categorySlug || '').includes('keripik') || (p.name || '').toLowerCase().includes('keripik') || (p.name || '').toLowerCase().includes('bibit');
                      const modelUsed = isIntermittent ? 'Croston SBA' : 'ARIMA';

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ width: '14.28%', padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 800, color: '#1b4332' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{p.id}</div>
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 14px', textAlign: 'left', verticalAlign: 'middle', color: '#64748b' }}>
                            {p.category}
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: isRestock ? '#dc2626' : '#15803d' }}>
                            {formatStockUnit(p.stock, p.unit)}
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#475569' }}>
                            {formatStockUnit(ss, p.unit)}
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#475569' }}>
                            {formatStockUnit(rop, p.unit)}
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {isRestock ? (
                              <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, border: '1px solid #fca5a5', display: 'inline-block' }}>
                                PERLU RESTOCK
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, border: '1px solid #86efac', display: 'inline-block' }}>
                                STOK AMAN
                              </span>
                            )}
                          </td>
                          <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                backgroundColor: modelUsed.includes('Croston') ? '#fef3c7' : '#e0f2fe',
                                color: modelUsed.includes('Croston') ? '#b45309' : '#0369a1',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                display: 'inline-block',
                              }}
                            >
                              {modelUsed}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            B. HALAMAN AKTIVITAS 1: BARANG MASUK
        ===================================================================== */}
        {activeMenu === 'barang-masuk' && (
          <BarangMasuk
            products={products}
            movements={movements}
            forecasts={forecasts}
            user={user}
            onSaveProducts={handleSaveProducts}
            onSaveMovements={handleSaveMovements}
            onSaveForecasts={handleSaveForecasts}
            onExportCsv={handleExportReport}
            onBackToDashboard={() => setActiveMenu('dashboard')}
            onNavigateToForecast={() => setActiveMenu('analisis-forecast')}
          />
        )}

        {/* =====================================================================
            C. HALAMAN AKTIVITAS 2: BARANG KELUAR
        ===================================================================== */}
        {activeMenu === 'barang-keluar' && (
          <BarangKeluar
            products={products}
            movements={movements}
            forecasts={forecasts}
            user={user}
            onSaveProducts={handleSaveProducts}
            onSaveMovements={handleSaveMovements}
            onSaveForecasts={handleSaveForecasts}
            onExportCsv={handleExportReport}
            onBackToDashboard={() => setActiveMenu('dashboard')}
            onNavigateToForecast={() => setActiveMenu('analisis-forecast')}
          />
        )}

        {/* =====================================================================
            D. HALAMAN AKTIVITAS 3: ANALISIS FORECAST
        ===================================================================== */}
        {activeMenu === 'analisis-forecast' && (
          <AnalisisForecast
            products={products}
            forecasts={forecasts}
            user={user}
            onSaveForecasts={handleSaveForecasts}
            onExportCsv={handleExportReport}
            onBackToDashboard={() => setActiveMenu('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
