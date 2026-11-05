import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './data/mockAuth';

// Import komponen dari folder masing-masing peran (RBAC & Auth)
import KatalogPelanggan from './customer/KatalogPelanggan';
import Login from './auth/Login';
import ChangePassword from './auth/ChangePassword';
import DashboardSuperAdmin from './super-admin/DashboardSuperAdmin';
import DashboardSalesAdmin from './sales-admin/DashboardSalesAdmin';
import DashboardStockManager from './stock-manager/DashboardStockManager';

function MainApp() {
  const { user, role, isAuthenticated, loading, logout } = useAuth();

  // Persist currentView: jika sudah login, masuk dashboard; jika belum, katalog publik
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('farmsight_current_view');
    if (saved && (saved === 'catalog' || saved === 'login' || saved === 'dashboard')) {
      return saved;
    }
    return isAuthenticated ? 'dashboard' : 'catalog';
  });

  const handleSetCurrentView = (view) => {
    setCurrentView(view);
    localStorage.setItem('farmsight_current_view', view);
  };

  const handleStaffLogout = () => {
    logout();
    handleSetCurrentView('catalog');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f4f6f4',
          color: '#1b4332',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        Memuat FarmSight Toko Farm Berkah...
      </div>
    );
  }

  // 1. Tampilan Katalog Publik untuk Pelanggan (Customer / Tamu)
  if (currentView === 'catalog' || (!isAuthenticated && currentView !== 'login')) {
    return (
      <KatalogPelanggan
        onOpenLogin={() => handleSetCurrentView('login')}
        onGoToDashboard={() => handleSetCurrentView('dashboard')}
      />
    );
  }

  // 2. Tampilan Form Login Internal Staf
  if (currentView === 'login' && !isAuthenticated) {
    return (
      <Login
        onBackToCatalog={() => handleSetCurrentView('catalog')}
        onLoginSuccess={() => handleSetCurrentView('dashboard')}
        onRequirePasswordChange={() => handleSetCurrentView('dashboard')}
      />
    );
  }

  // 3. GATEWAY KEAMANAN: Cek apakah akun memiliki status must_change_password = true?
  // Jika YA -> Tampilkan halaman/pop-up Wajib Ganti Password terlebih dahulu sebelum masuk ke Dashboard
  if (isAuthenticated && user?.must_change_password) {
    return (
      <ChangePassword
        onPasswordChanged={() => handleSetCurrentView('dashboard')}
        onLogout={handleStaffLogout}
      />
    );
  }

  // 4. GATEWAY IDENTIFIKASI PERAN (ROLE-BASED DASHBOARD)

  // Peran 1: SUPER ADMIN -> super-admin/DashboardSuperAdmin.jsx
  // Fitur: Manajemen Akun (Tambah Akun + Reset Password) & Manajemen Produk (Tambah/Edit + Visibilitas Publik)
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <DashboardSuperAdmin
        onLogout={handleStaffLogout}
        onViewCatalog={() => handleSetCurrentView('catalog')}
      />
    );
  }

  // Peran 2: SALES ADMIN -> sales-admin/DashboardSalesAdmin.jsx
  // Fitur: Inbox Pesanan WA, Create Order, Gateway 1 (Cek Stok), Gateway 2 (Verifikasi Transfer QRIS), Mutasi Stok & Alert ROP
  if (role === ROLES.SALES_ADMIN) {
    return (
      <DashboardSalesAdmin
        onLogout={handleStaffLogout}
        onViewCatalog={() => handleSetCurrentView('catalog')}
      />
    );
  }

  // Peran 3: STOCK MANAGER -> stock-manager/DashboardStockManager.jsx
  // Fitur: 3 Aksi (Barang Masuk, Barang Keluar, Analisis Forecast), Gateway ROP, ARIMA & Croston SBA, Export Laporan
  if (role === ROLES.STOCK_MANAGER) {
    return (
      <DashboardStockManager
        onLogout={handleStaffLogout}
        onViewCatalog={() => handleSetCurrentView('catalog')}
      />
    );
  }

  // Default Fallback
  return (
    <DashboardSalesAdmin
      onLogout={handleStaffLogout}
      onViewCatalog={() => handleSetCurrentView('catalog')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
