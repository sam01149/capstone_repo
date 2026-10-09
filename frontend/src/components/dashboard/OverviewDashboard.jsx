import React, { useState } from 'react';
import {
  Boxes,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  TrendingDown,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';

export default function OverviewDashboard({ onNavigate }) {
  const { user, role } = useAuth();
  const [activeDashboardView, setActiveDashboardView] = useState('all'); // 'all', 'inventory', 'sales'

  // Low Stock & Critical Inventory Data (FR-ID1 s/d ID7)
  const lowStockProducts = [
    { id: 'MLB', name: 'Minuman Jelly Bunga Telang 250ml', cat: 'Minuman Herbal', stock: 6, min: 20, ss: 8, rop: 20, status: 'Kritis' },
    { id: 'LDB', name: 'Permen Lidah Buaya Manis 100g', cat: 'Olahan Aloe Vera', stock: 12, min: 25, ss: 10, rop: 25, status: 'Di Bawah ROP' },
    { id: 'KKG', name: 'Kue Kering Olahan Labu Berkah', cat: 'Olahan Labu', stock: 18, min: 15, ss: 8, rop: 18, status: 'Mendekati ROP' },
    { id: 'MDT', name: 'Keripik Labu Madu 150g', cat: 'Olahan Labu', stock: 48, min: 20, ss: 15, rop: 30, status: 'Aman' },
    { id: 'CKP', name: 'Cokelat Lidah Buaya Premium', cat: 'Olahan Aloe Vera', stock: 35, min: 15, ss: 10, rop: 20, status: 'Aman' },
  ];

  // Best Selling Products (FR-SD1 s/d SD7)
  const topSellingProducts = [
    { name: 'Keripik Labu Madu 150g', sold: '520+ pcs', revenue: 'Rp 9.360.000', growth: '+24%' },
    { name: 'Minuman Segar Lidah Buaya', sold: '450+ botol', revenue: 'Rp 5.400.000', growth: '+18%' },
    { name: 'Es Bunga Telang Lemon', sold: '480+ cup', revenue: 'Rp 3.840.000', growth: '+15%' },
    { name: 'Cokelat Lidah Buaya Bar', sold: '310+ pcs', revenue: 'Rp 7.750.000', growth: '+12%' },
  ];

  // Recent Orders (FR-SO & FR-OI)
  const recentOrders = [
    { id: 'ORD-2026-081', customer: 'Ibu Ratna (Reseller)', items: 'Keripik Labu (10 pcs)', total: 'Rp 180.000', stockCheck: 'Stok Cukup', status: 'Pending' },
    { id: 'ORD-2026-080', customer: 'Bpk. Hendra (Offline)', items: 'Jelly Telang (5 pcs)', total: 'Rp 65.000', stockCheck: 'Stok Terpenuhi', status: 'Diproses' },
    { id: 'ORD-2026-079', customer: 'Toko Cemilan Bu Wardah', items: 'Cokelat Aloe (15 pcs)', total: 'Rp 270.000', stockCheck: 'Selesai Dikirim', status: 'Selesai' },
    { id: 'ORD-2026-078', customer: 'Ibu Maya (Jakarta)', items: 'Permen Aloe (2 pcs)', total: 'Rp 24.000', stockCheck: 'Dibatalkan Pembeli', status: 'Dibatalkan' },
  ];

  return (
    <div style={{ padding: '24px 32px' }} className="animate-fade-in">
      {/* 1. Header & Welcome Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Selamat Datang, {user?.name}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#667085', margin: 0 }}>
            {user?.roleTitle || 'Super Admin'} &bull; Sistem Monitoring Terpadu Toko Farm Berkah
          </p>
        </div>

        {/* View Toggle Filter & Session Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#e9efe9', padding: '3px', borderRadius: '24px' }}>
            <button
              onClick={() => setActiveDashboardView('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeDashboardView === 'all' ? '#ffffff' : 'transparent',
                color: activeDashboardView === 'all' ? '#1b4332' : '#48564e',
                fontWeight: activeDashboardView === 'all' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activeDashboardView === 'all' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Semua Ringkasan
            </button>
            <button
              onClick={() => setActiveDashboardView('inventory')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeDashboardView === 'inventory' ? '#ffffff' : 'transparent',
                color: activeDashboardView === 'inventory' ? '#1b4332' : '#48564e',
                fontWeight: activeDashboardView === 'inventory' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activeDashboardView === 'inventory' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              📦 Inventory Dashboard
            </button>
            <button
              onClick={() => setActiveDashboardView('sales')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeDashboardView === 'sales' ? '#ffffff' : 'transparent',
                color: activeDashboardView === 'sales' ? '#1b4332' : '#48564e',
                fontWeight: activeDashboardView === 'sales' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activeDashboardView === 'sales' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              💰 Sales Dashboard
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #e1e7e2',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#48564e',
            }}
          >
            <Clock size={13} color="#2d6a4f" />
            <span>Sesi: <strong>{user?.lastLogin || 'Hari ini'}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. SECTION A: INVENTORY DASHBOARD (FR-ID1 s/d ID7) */}
      {(activeDashboardView === 'all' || activeDashboardView === 'inventory') && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Boxes size={18} color="#2d6a4f" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                Inventory Dashboard (Persediaan & Stok)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              style={{ background: 'none', border: 'none', color: '#2d6a4f', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              Buka Manajemen Persediaan <ChevronRight size={14} />
            </button>
          </div>

          {/* NFR-USE-2 Narrative Summary for Inventory */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              fontSize: '0.825rem',
              color: '#166534',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={17} color="#b45309" style={{ flexShrink: 0 }} />
            <div>
              <strong>Ringkasan Persediaan (NFR-USE-2):</strong> Sebanyak <strong>2 produk</strong> berada di bawah batas Reorder Point (Minuman Jelly Telang 6 pcs & Permen Lidah Buaya 12 pcs). Disarankan segera melakukan restock bahan baku atau penjadwalan batch produksi.
            </div>
          </div>

          {/* Inventory KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Produk (SKU)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019', marginTop: '4px' }}>43 SKU</div>
              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>5 Kategori Terdata</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Stok Fisik</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019', marginTop: '4px' }}>1.240 Unit</div>
              <span style={{ fontSize: '0.75rem', color: '#2d6a4f' }}>Gudang Komplek Masnaga</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Stok Masuk (Stock In)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>+185 Unit</div>
              <span style={{ fontSize: '0.75rem', color: '#667085' }}>Bulan Berjalan</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Stok Keluar (Stock Out)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>-142 Unit</div>
              <span style={{ fontSize: '0.75rem', color: '#667085' }}>Pesanan Pelanggan</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock & ROP Alert</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>2 SKU</div>
              <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Perlu Pengadaan</span>
            </div>
          </div>

          {/* Low Stock Table & Mini Forecasting Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1e7e2', fontWeight: 700, fontSize: '0.85rem', color: '#142019' }}>
                Daftar Produk Low Stock & Status ROP (FR-ID4 & ID5)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Produk</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stok</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Safety Stock</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>ROP</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#142019' }}>{p.name}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#142019' }}>{p.stock} pcs</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#718277' }}>{p.ss} pcs</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#718277' }}>{p.rop} pcs</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: p.status === 'Aman' ? '#eefbf3' : p.status === 'Kritis' ? '#fee2e2' : '#fef3c7',
                            color: p.status === 'Aman' ? '#16a34a' : p.status === 'Kritis' ? '#dc2626' : '#b45309',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mini Forecasting Chart Snapshot (FR-ID7) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e1e7e2', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#142019' }}>Grafik Hasil Forecasting (FR-ID7)</span>
                <span style={{ fontSize: '0.72rem', color: '#2d6a4f', fontWeight: 600 }}>Horizon 4 Minggu</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#667085', margin: '0 0 12px 0' }}>
                Model: <strong>ARIMA & Croston SBA</strong> (Service Level 95%)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#48564e', marginBottom: '2px' }}>
                    <span>Minggu ke-1</span>
                    <strong>35 pcs (Aktual vs Prediksi: Optimal)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', backgroundColor: '#2d6a4f', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#48564e', marginBottom: '2px' }}>
                    <span>Minggu ke-2</span>
                    <strong>38 pcs (Kenaikan Permintaan)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', backgroundColor: '#2d6a4f', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#48564e', marginBottom: '2px' }}>
                    <span>Minggu ke-3</span>
                    <strong>32 pcs (Stabil)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '78%', height: '100%', backgroundColor: '#2d6a4f', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#48564e', marginBottom: '2px' }}>
                    <span>Minggu ke-4</span>
                    <strong>40 pcs (Puncak Penjualan)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '98%', height: '100%', backgroundColor: '#0284c7', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. SECTION B: SALES DASHBOARD (FR-SD1 s/d SD7) */}
      {(activeDashboardView === 'all' || activeDashboardView === 'sales') && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="#2d6a4f" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                Sales Dashboard (Penjualan & Pesanan)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              style={{ background: 'none', border: 'none', color: '#2d6a4f', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              Buka Manajemen Pesanan <ChevronRight size={14} />
            </button>
          </div>

          {/* NFR-USE-2 Narrative Summary for Sales */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              fontSize: '0.825rem',
              color: '#0369a1',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <TrendingUp size={17} color="#0284c7" style={{ flexShrink: 0 }} />
            <div>
              <strong>Ringkasan Penjualan (NFR-USE-2):</strong> Total penjualan berjalan mencapai <strong>Rp 4.850.000</strong> dari <strong>28 pesanan</strong>. Produk <strong>Keripik Labu Madu 150g</strong> menduduki peringkat terlaris (+24% volume penjualan).
            </div>
          </div>

          {/* Sales KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Pesanan</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019', marginTop: '4px' }}>28 Pesanan</div>
              <span style={{ fontSize: '0.75rem', color: '#2d6a4f' }}>Semua Kanal Penjualan</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Pending (Menunggu)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>3 Pesanan</div>
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>Perlu Konfirmasi Admin</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Pesanan Selesai</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>23 Pesanan</div>
              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Terkirim & Lunas</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Dibatalkan</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>2 Pesanan</div>
              <span style={{ fontSize: '0.75rem', color: '#667085' }}>Batal oleh Pelanggan</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e1e7e2' }}>
              <span style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Total Nilai Penjualan</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b4332', marginTop: '6px' }}>Rp 4.850.000</div>
              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>+18% dari Bulan Lalu</span>
            </div>
          </div>

          {/* Top Selling & Recent Orders Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '16px' }}>
            {/* Top Selling Products (FR-SD6) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e1e7e2', padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#142019', marginBottom: '12px' }}>
                Produk Terlaris (Top Selling)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topSellingProducts.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px', border: '1px solid #e1e7e2' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#142019' }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#718277' }}>Terjual: {p.sold}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.825rem', color: '#2d6a4f' }}>{p.revenue}</div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a' }}>{p.growth}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders Queue (FR-SO & FR-OI) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1e7e2', fontWeight: 700, fontSize: '0.85rem', color: '#142019' }}>
                Daftar Pesanan Terkini (FR-SO & FR-OI)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>No. Pesanan</th>
                    <th style={{ padding: '8px 10px' }}>Pelanggan</th>
                    <th style={{ padding: '8px 10px' }}>Total</th>
                    <th style={{ padding: '8px 10px' }}>Stok</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2d6a4f' }}>{o.id}</td>
                      <td style={{ padding: '9px 10px' }}>{o.customer}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#142019' }}>{o.total}</td>
                      <td style={{ padding: '9px 10px', fontSize: '0.72rem', color: '#16a34a' }}>{o.stockCheck}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: o.status === 'Selesai' ? '#eefbf3' : o.status === 'Diproses' ? '#f0f9ff' : o.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                            color: o.status === 'Selesai' ? '#16a34a' : o.status === 'Diproses' ? '#0369a1' : o.status === 'Pending' ? '#b45309' : '#dc2626',
                          }}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

