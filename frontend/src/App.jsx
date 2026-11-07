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
    else if (view === 'staff-catalog') targetHash = '#/katalog-staf';
    else if (view === 'login') targetHash = '#/login';
    else if (view === 'dashboard') targetHash = '#/dashboard';
    else targetHash = '#/';

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStaffLogout = () => {
    logout();
    navigateTo('landing');
  };

  // Pastikan saat staf berhasil login, otomatis LANGSUNG diarahkan ke Dashboard Role masing-masing (bukan ke katalog)
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentView('dashboard');
      localStorage.setItem('farmsight_view', 'dashboard');
      if (window.location.hash !== '#/dashboard' && window.location.hash !== '#/katalog-staf') {
        window.location.hash = '#/dashboard';
      }
    }
  }, [isAuthenticated]);

  // Zero-Exit Browser History Management
  useEffect(() => {
    const currentHash = window.location.hash;

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

  if (loading && isAuthenticated && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4', color: '#1b4332', fontWeight: 700 }}>
        Memuat FarmSight Toko Farm Berkah...
      </div>
    );
  }

  // =========================================================================
  // A. PENGGUNA TERAUTENTIKASI (SUDAH LOGIN): LANGSUNG KE DASHBOARD ROLE!
  // =========================================================================
  if (isAuthenticated) {
    // 1. Gateway Keamanan: Wajib Ganti Password jika akun berstatus must_change_password
    if (user?.must_change_password) {
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

    // 2. Hanya jika staf secara eksplisit menekan tombol "Lihat Katalog" di dalam dashboard
    if (currentView === 'staff-catalog' && window.location.hash === '#/katalog-staf') {
      return (
        <KatalogStaff
          onBackToHome={() => navigateTo('dashboard')}
          onGoToDashboard={() => navigateTo('dashboard')}
          onLogout={handleStaffLogout}
        />
      );
    }

    // 3. UTAMA: Masuk ke Dashboard Role Masing-Masing!
    const currentRole = String(role || user?.role || '').toUpperCase().trim();

    // Role 1: SUPER ADMIN -> Pusat Kontrol Pemilik, Manajemen Akun & Manajemen Produk
    if (currentRole.includes('SUPER') || currentRole === 'ADMIN' || currentRole === ROLES.SUPER_ADMIN) {
      return (
        <DashboardSuperAdmin
          onLogout={handleStaffLogout}
          onViewCatalog={() => navigateTo('staff-catalog')}
        />
      );
    }

    // Role 2: STOCK MANAGER -> Gudang, Inventaris, ROP & Mutasi
    if (currentRole.includes('STOCK') || currentRole.includes('GUDANG') || currentRole === ROLES.STOCK_MANAGER) {
      return (
        <DashboardStockManager
          onLogout={handleStaffLogout}
          onViewCatalog={() => navigateTo('staff-catalog')}
        />
      );
    }

    // Role 3: SALES ADMIN -> Pesanan Customer, WA Inbox, Verifikasi Pembayaran
    if (currentRole.includes('SALES') || currentRole.includes('PENJUALAN') || currentRole === ROLES.SALES_ADMIN) {
      return (
        <DashboardSalesAdmin
          onLogout={handleStaffLogout}
          onViewCatalog={() => navigateTo('staff-catalog')}
        />
      );
    }

    // Fallback jika peran tidak dikenal
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4', padding: '24px' }}>
        <h2>Peran Akun Tidak Dikenal</h2>
        <p style={{ color: '#64748b' }}>Role: {role || user?.role || 'Kosong'}</p>
        <button onClick={handleStaffLogout} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#2d6a4f', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
          Keluar Sesi
        </button>
      </div>
    );
  }

  // =========================================================================
  // B. PENGGUNA BELUM LOGIN (GUEST / PUBLIK):
  // =========================================================================

  // 1. Form Login Internal Staf (Jika belum login dan berada di login atau dashboard)
  if (currentView === 'login' || window.location.hash === '#/login' || window.location.hash === '#/dashboard' || currentView === 'dashboard') {
    return (
      <Login
        onBackToHome={() => navigateTo('landing')}
        onBackToCatalog={() => navigateTo('catalog')}
        onLoginSuccess={() => {
          navigateTo('dashboard');
          addToast('Berhasil masuk ke portal staf', 'success');
        }}
        onRequirePasswordChange={() => {
          navigateTo('dashboard');
        }}
      />
    );
  }

  // 2. Katalog Publik Pelanggan (Hanya jika secara eksplisit membuka katalog)
  if (currentView === 'catalog' || window.location.hash === '#/katalog' || window.location.hash.startsWith('#/katalog/')) {
    return (
      <KatalogPelanggan
        onBackToHome={() => navigateTo('landing')}
        onOpenLogin={() => navigateTo('login')}
        onGoToDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  // 3. Landing Page Default
  return (
    <LandingPage
      onGoToCatalog={() => navigateTo('catalog')}
      onGoToLogin={() => navigateTo('login')}
    />
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
