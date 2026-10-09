import React from 'react';
import {
  Shield,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';
import RoleBadge from '../auth/RoleBadge';

export default function OverviewDashboard({ onNavigate }) {
  const { user, role, hasPermission } = useAuth();
  const roleConfig = ROLE_DETAILS[role];

  // Mock Products & Stock Status
  const sampleProducts = [
    { id: 'PRD-01', name: 'Keripik Labu Madu 150g', cat: 'Olahan Labu', stock: 48, rpo: 30, ss: 15, status: 'Aman' },
    { id: 'PRD-02', name: 'Permen Lidah Buaya 100g', cat: 'Olahan Aloe', stock: 12, rpo: 25, ss: 10, status: 'Di Bawah ROP' },
    { id: 'PRD-03', name: 'Minuman Jelly Telang 250ml', cat: 'Minuman Herbal', stock: 6, rpo: 20, ss: 8, status: 'Kritis' },
    { id: 'PRD-04', name: 'Cokelat Lidah Buaya Bar', cat: 'Olahan Aloe', stock: 35, rpo: 20, ss: 10, status: 'Aman' },
  ];

  // Mock Orders
  const sampleOrders = [
    { id: 'ORD-2026-081', customer: 'Ibu Ratna (Reseller)', items: 'Keripik Labu (10 pcs)', total: 'Rp 180.000', status: 'Menunggu Konfirmasi' },
    { id: 'ORD-2026-080', customer: 'Bpk. Hendra (Offline)', items: 'Jelly Telang (5 pcs)', total: 'Rp 65.000', status: 'Diproses' },
    { id: 'ORD-2026-079', customer: 'Toko Cemilan Bu Wardah', items: 'Cokelat Aloe (15 pcs)', total: 'Rp 270.000', status: 'Selesai' },
  ];

  return (
    <div style={{ padding: '24px' }} className="animate-fade-in">
      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e1e7e2',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: roleConfig.bg,
              color: roleConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${roleConfig.border}`,
            }}
          >
            {role === ROLES.SUPER_ADMIN && <Shield size={28} />}
            {role === ROLES.STOCK_MANAGER && <Package size={28} />}
            {role === ROLES.SALES_ADMIN && <ShoppingCart size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019' }}>
                Selamat Datang, {user?.name}
              </h1>
              <RoleBadge role={role} size="md" />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
              {roleConfig.description}
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8faf8',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid #e1e7e2',
            fontSize: '0.8rem',
            color: '#48564e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Clock size={15} color="#2d6a4f" />
          <span>Sesi Login: <strong>{user?.lastLogin || 'Baru saja'}</strong></span>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '18px',
            borderRadius: '14px',
            border: '1px solid #e1e7e2',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#718277' }}>TOTAL PRODUK UMKM</span>
            <Boxes size={18} color="#2d6a4f" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019' }}>35 SKU</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={13} />
            <span>5 Kategori terdata</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '18px',
            borderRadius: '14px',
            border: '1px solid #e1e7e2',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#718277' }}>PERINGATAN RESTOCK (ROP)</span>
            <AlertTriangle size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>2 Produk</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '4px' }}>
            Stok mendekati/di bawah ROP
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '18px',
            borderRadius: '14px',
            border: '1px solid #e1e7e2',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#718277' }}>PESANAN AKTIF</span>
            <ShoppingCart size={18} color="#2d6a4f" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#142019' }}>3 Pesanan</div>
          <div style={{ fontSize: '0.75rem', color: '#2d6a4f', marginTop: '4px' }}>
            1 menunggu konfirmasi sales
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '18px',
            borderRadius: '14px',
            border: '1px solid #e1e7e2',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#718277' }}>METODE FORECASTING</span>
            <TrendingUp size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', marginTop: '4px' }}>ARIMA & Croston</div>
          <div style={{ fontSize: '0.75rem', color: '#718277', marginTop: '4px' }}>
            Service Level: 95% (z=1.65)
          </div>
        </div>
      </div>

      {/* Role-Based Operations Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Card: Dynamic Role Data */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e1e7e2',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#142019' }}>
              {role === ROLES.SUPER_ADMIN && 'Ringkasan Seluruh Operasional UMKM'}
              {role === ROLES.STOCK_MANAGER && 'Monitoring Persediaan & Titik Pemesanan (ROP)'}
              {role === ROLES.SALES_ADMIN && 'Daftar Pesanan Pelanggan Terkini'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#2d6a4f', fontWeight: 600 }}>Toko Farm Berkah</span>
          </div>

          {/* Conditional Content based on role */}
          {role === ROLES.SALES_ADMIN ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sampleOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#fafcfa',
                    border: '1px solid #e1e7e2',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#142019', fontSize: '0.85rem' }}>{ord.customer}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718277' }}>{ord.id} &bull; {ord.items}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#142019', fontSize: '0.85rem' }}>{ord.total}</div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: ord.status === 'Selesai' ? '#dcfce7' : ord.status === 'Diproses' ? '#e0f2fe' : '#fef3c7',
                        color: ord.status === 'Selesai' ? '#16a34a' : ord.status === 'Diproses' ? '#0284c7' : '#b45309',
                      }}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sampleProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#fafcfa',
                    border: '1px solid #e1e7e2',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#142019', fontSize: '0.85rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718277' }}>
                      Kategori: {p.cat} &bull; ROP: {p.rpo} pcs &bull; Safety Stock: {p.ss} pcs
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#142019', fontSize: '0.95rem' }}>{p.stock} pcs</div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: p.status === 'Aman' ? '#dcfce7' : p.status === 'Kritis' ? '#fee2e2' : '#fef3c7',
                        color: p.status === 'Aman' ? '#16a34a' : p.status === 'Kritis' ? '#dc2626' : '#b45309',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Card: Authorization & Role Capability Matrix */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e1e7e2',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Shield size={18} color="#2d6a4f" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#142019' }}>
              Hak Akses Peran ({roleConfig.name})
            </h3>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#48564e', marginBottom: '14px' }}>
            Berikut adalah status otorisasi fungsional untuk peran Anda saat ini (FR-A-5 & FR-A-6):
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#142019' }}>Manajemen Pengguna (User Management)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hasPermission('manage_users') ? '#16a34a' : '#dc2626' }}>
                {hasPermission('manage_users') ? 'Diizinkan' : 'Dibatasi'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#142019' }}>Manajemen Persediaan & Stok</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hasPermission('manage_inventory') ? '#16a34a' : '#dc2626' }}>
                {hasPermission('manage_inventory') ? 'Diizinkan' : 'Dibatasi'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#142019' }}>Pencatatan Stock Movement (In/Out)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hasPermission('manage_stock_movement') ? '#16a34a' : '#dc2626' }}>
                {hasPermission('manage_stock_movement') ? 'Diizinkan' : 'Dibatasi'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#142019' }}>Penerimaan & Kelola Pesanan</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hasPermission('manage_orders') ? '#16a34a' : '#dc2626' }}>
                {hasPermission('manage_orders') ? 'Diizinkan' : 'Dibatasi'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#f8faf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#142019' }}>Demand Forecasting & Safety Stock</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hasPermission('manage_forecasting') || role === ROLES.STOCK_MANAGER ? '#16a34a' : '#dc2626' }}>
                {hasPermission('manage_forecasting') || role === ROLES.STOCK_MANAGER ? 'Diizinkan' : 'Dibatasi'}
              </span>
            </div>
          </div>

          {role === ROLES.SUPER_ADMIN && (
            <button
              onClick={() => onNavigate('users')}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2d6a4f',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Users size={15} />
              <span>Buka Menu Manajemen Pengguna</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Comparison Table Guide */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e1e7e2',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Sparkles size={18} color="#d97706" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#142019' }}>
            Matriks Hak Akses & Otorisasi Sistem FarmSight (Tabel Spesifikasi Bab III)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Modul / Fungsionalitas</th>
                <th style={{ padding: '10px 14px' }}>Super Admin (Ibu Intan)</th>
                <th style={{ padding: '10px 14px' }}>Stock Manager (Budi)</th>
                <th style={{ padding: '10px 14px' }}>Sales Admin (Siti)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Autentikasi (Login / Logout / Change PW)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Penuh)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Manajemen Akun & Reset PW Pengguna</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>Ya (CRUD Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>Tidak Ada Akses</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>Tidak Ada Akses</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Manajemen Persediaan & Stok Fisik</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Kontrol Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>Ya (Fokus Utama)</td>
                <td style={{ padding: '10px 14px', color: '#718277' }}>Lihat Saja (Stok Cek)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Pencatatan Stock Movement (In/Out/Rusak)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>Tidak Ada Akses</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Penerimaan & Validasi Pesanan Pelanggan</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Monitoring)</td>
                <td style={{ padding: '10px 14px', color: '#718277' }}>Lihat Hubungan Stok</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>Ya (Fokus Utama)</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>Perhitungan Safety Stock & Reorder Point</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>Ya (Penuh)</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>Tidak Ada Akses</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
