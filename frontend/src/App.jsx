import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider, useToast } from './shared/Toast';
import { ROLES } from './types';

// 1. Landing Page (Halaman Utama dengan 2 Pintu: Guest vs Staf)
import { LandingPage } from './landing/LandingPage';

// 2. Katalog Pelanggan (Authentic 43 items, filter lengkap & formulir WA)
import KatalogPelanggan from './customer/KatalogPelanggan';

// 2b. Katalog Staf (Khusus Staf: Pemantauan stok fisik, batas minimum & spesifikasi produk tanpa duplikasi)
import KatalogStaff from './staff/KatalogStaff';

// 3. Login Staf (Desain minimalis aesthetic Dribbble, 4 quick demo buttons, lupa sandi)
import Login from './auth/Login';

// 4. Wajib Ganti Password Modal (Gateway keamanan must_change_password)
import ChangePassword from './auth/ChangePassword';

// 5. Dashboard Berbasis Peran (Super Admin, Stock Manager, Sales Admin)
import DashboardSuperAdmin from './super-admin/DashboardSuperAdmin';
import DashboardSalesAdmin from './sales-admin/DashboardSalesAdmin';
import DashboardStockManager from './stock-manager/DashboardStockManager';

function MainRouter() {
  const { user, role, isAuthenticated, loading, logout } = useAuth();
  const { addToast } = useToast();

  // Root view: 'landing' | 'catalog' | 'login' | 'dashboard'
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === '/login') return 'login';
    if (hash === '/katalog' || hash.startsWith('/katalog/')) return 'catalog';
    if (hash.startsWith('/admin') || hash.startsWith('/inventory') || hash.startsWith('/sales') || hash === '/dashboard') {
      return 'dashboard';
    }
    const saved = localStorage.getItem('farmsight_view');
    if (saved && (saved === 'catalog' || saved === 'login' || saved === 'dashboard')) return saved;
    return 'landing';
  });

  const navigateTo = (view) => {
    setCurrentView(view);
    localStorage.setItem('farmsight_view', view);

    let targetHash = '#/';
    if (view === 'catalog') targetHash = '#/katalog';
    else if (view === 'login') targetHash = '#/login';
    else if (view === 'dashboard') targetHash = '#/dashboard';
    else targetHash = '#/';

    if (window.location.hash !== targetHash) {
      window.history.pushState({ view }, '', targetHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStaffLogout = () => {
    logout();
    navigateTo('landing');
  };

  // Zero-Exit Browser History Management (Tombol Back Laptop/Browser Selalu Kembali ke Halaman Sebelumnya di Web)
  useEffect(() => {
    const currentHash = window.location.hash;

    // Jika user me-refresh atau membuka langsung sub-halaman (#/katalog, #/login, #/dashboard),
    // masukkan '#/' (Landing) di tumpukan riwayat browser paling awal,
    // sehingga ketika tombol back laptop ditekan, PASTI kembali ke halaman utama FarmSight, BUKAN keluar ke MSN / tab baru!
    if (currentHash && currentHash !== '#/' && currentHash !== '#') {
      window.history.replaceState({ view: 'landing' }, '', '#/');
      window.history.pushState({ view: currentView }, '', currentHash);
    } else {
      window.history.replaceState({ view: 'landing' }, '', '#/');
    }

    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '');

      if (hash === '/' || hash === '') {
        setCurrentView('landing');
        // Kunci di halaman landing agar jika user menekan back lagi tidak langsung keluar dari web
        window.history.pushState({ view: 'landing' }, '', '#/');
      } else if (hash === '/katalog' || hash.startsWith('/katalog/')) {
        setCurrentView('catalog');
      } else if (hash === '/login') {
        setCurrentView('login');
      } else if (hash.startsWith('/admin') || hash.startsWith('/inventory') || hash.startsWith('/sales') || hash === '/dashboard') {
        setCurrentView('dashboard');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4', color: '#1b4332', fontWeight: 700 }}>
        Memuat FarmSight Toko Farm Berkah...
      </div>
    );
  }

  // 1. Halaman Utama / Landing Page (Dua pintu masuk: Guest vs Staf)
  if (currentView === 'landing' && !isAuthenticated) {
    return (
      <LandingPage
        onGoToCatalog={() => navigateTo('catalog')}
        onGoToLogin={() => navigateTo('login')}
      />
    );
  }

  // 2. Katalog: Terpisah Khusus Staf (KatalogStaff) vs Khusus Pelanggan (KatalogPelanggan)
  if (currentView === 'catalog' || (!isAuthenticated && currentView !== 'login')) {
    if (isAuthenticated) {
      return (
        <KatalogStaff
          onBackToHome={() => navigateTo('landing')}
          onGoToDashboard={() => navigateTo('dashboard')}
          onLogout={handleStaffLogout}
        />
      );
    }
    return (
      <KatalogPelanggan
        onBackToHome={() => navigateTo('landing')}
        onOpenLogin={() => navigateTo('login')}
        onGoToDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  // 3. Form Login Internal Staf (Tampilan aesthetic sebelumnya + 4 akun demo 1-klik)
  if (currentView === 'login' && !isAuthenticated) {
    return (
      <Login
        onBackToHome={() => navigateTo('landing')}
        onBackToCatalog={() => navigateTo('catalog')}
        onLoginSuccess={() => {
          navigateTo('dashboard');
          addToast('Berhasil masuk ke portal staf FarmSight', 'success');
        }}
        onRequirePasswordChange={() => {
          navigateTo('dashboard');
        }}
      />
    );
  }

  // 4. Gateway Keamanan: Wajib Ganti Password jika akun staf memiliki status must_change_password = true
  if (isAuthenticated && user?.must_change_password) {
    return (
      <ChangePassword
        onPasswordChanged={() => {
          navigateTo('dashboard');
          addToast('Kata sandi berhasil diperbarui', 'success');
        }}
        onLogout={handleStaffLogout}
      />
    );
  }

  // 5. Gateway Otorisasi Berdasarkan Peran (Role-Based Dashboard)
  const currentRole = String(role || user?.role || '').toUpperCase().trim();

  // Peran 1: SUPER ADMIN -> Manajemen Akun (Tambah + Reset Password) & Manajemen Produk
  if (currentRole.includes('SUPER') || currentRole === 'ADMIN' || currentRole === ROLES.SUPER_ADMIN) {
    return (
      <DashboardSuperAdmin
        onLogout={handleStaffLogout}
        onViewCatalog={() => navigateTo('catalog')}
      />
    );
  }

  // Peran 2: STOCK MANAGER -> Forecast Pendapatan, Log Inventaris, Pemantauan Model ARIMA & Croston SBA
  if (currentRole.includes('STOCK') || currentRole.includes('GUDANG') || currentRole === ROLES.STOCK_MANAGER) {
    return (
      <DashboardStockManager
        onLogout={handleStaffLogout}
        onViewCatalog={() => navigateTo('catalog')}
      />
    );
  }

  // Peran 3: SALES ADMIN -> Dashboard Penjualan, Inbox WhatsApp, Gateway 1 (Cek Stok & QRIS), Gateway 2 (Verifikasi Transfer)
  if (currentRole.includes('SALES') || currentRole.includes('PENJUALAN') || currentRole === ROLES.SALES_ADMIN) {
    return (
      <DashboardSalesAdmin
        onLogout={handleStaffLogout}
        onViewCatalog={() => navigateTo('catalog')}
      />
    );
  }

  // Fallback jika role belum terdefinisi
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4', padding: '24px' }}>
      <h2>Peran Akun Tidak Dikenal</h2>
      <p style={{ color: '#64748b' }}>Role: {role || 'Kosong'}</p>
      <button onClick={handleStaffLogout} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#2d6a4f', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
        Keluar Sesi
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <MainRouter />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
