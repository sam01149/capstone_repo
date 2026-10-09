import React from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Users,
  FileBarChart,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockAuth';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { role, isRole } = useAuth();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER, ROLES.SALES_ADMIN],
    },
    {
      id: 'products',
      label: 'Manajemen Produk',
      icon: PackageSearch,
      allowedRoles: [ROLES.SUPER_ADMIN], // Eksklusif Super Admin
      badge: 'Super Admin',
    },
    {
      id: 'inventory',
      label: 'Persediaan & Pergerakan Stok',
      icon: Boxes,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER],
    },
    {
      id: 'orders',
      label: 'Manajemen Pesanan',
      icon: ShoppingCart,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.SALES_ADMIN],
    },
    {
      id: 'forecasting',
      label: 'Demand Forecasting',
      icon: TrendingUp,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER],
    },
    {
      id: 'recommendation',
      label: 'Rekomendasi Persediaan',
      icon: AlertTriangle,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER],
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: FileBarChart,
      allowedRoles: [ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER, ROLES.SALES_ADMIN],
    },
    {
      id: 'users',
      label: 'Manajemen Pengguna & Peran',
      icon: Users,
      allowedRoles: [ROLES.SUPER_ADMIN], // Eksklusif Super Admin
      badge: 'Super Admin',
      restrictedNotice: 'Khusus Super Admin',
    },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e1e7e2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 12px',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px',
      }}
    >
      <div>
        <div style={{ padding: '0 8px 12px 8px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#718277', letterSpacing: '0.05em' }}>
          Menu Operasional Toko
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasAccess = item.allowedRoles.includes(role);
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive
                    ? '#2d6a4f'
                    : hasAccess
                    ? 'transparent'
                    : '#fbfcfb',
                  color: isActive
                    ? '#ffffff'
                    : hasAccess
                    ? '#142019'
                    : '#9aa8a0',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s, color 0.15s',
                  position: 'relative',
                  opacity: hasAccess ? 1 : 0.65,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && hasAccess) {
                    e.currentTarget.style.backgroundColor = '#f0fdf4';
                    e.currentTarget.style.color = '#1b4332';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && hasAccess) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#142019';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon
                    size={18}
                    color={isActive ? '#ffffff' : hasAccess ? '#2d6a4f' : '#9aa8a0'}
                  />
                  <span>{item.label}</span>
                </div>

                {!hasAccess ? (
                  <span title="Akses Dibatasi untuk Peran Anda" style={{ display: 'flex', alignItems: 'center' }}>
                    <Lock size={13} color="#9aa8a0" />
                  </span>
                ) : item.badge && !isActive ? (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f2',
                      color: '#48564e',
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Access Scope Info Card at bottom of sidebar */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f6f9f6',
          borderRadius: '12px',
          border: '1px solid #e1e7e2',
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1b4332', textTransform: 'uppercase', marginBottom: '4px' }}>
          Otorisasi & Keamanan
        </div>
        <div style={{ fontSize: '0.75rem', color: '#48564e', lineHeight: 1.4 }}>
          {role === ROLES.SUPER_ADMIN && 'Hak akses penuh ke data master, pengguna, forecasting, dan stok.'}
          {role === ROLES.STOCK_MANAGER && 'Akses fokus persediaan, stock movement, & rekomendasi pengadaan.'}
          {role === ROLES.SALES_ADMIN && 'Akses fokus penerimaan pesanan & validasi ketersediaan stok.'}
        </div>
      </div>
    </aside>
  );
}
