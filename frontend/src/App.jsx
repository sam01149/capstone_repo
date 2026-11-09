import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { CartProvider } from './customer/CartContext';
import { NotificationProvider } from './sales-admin/NotificationContext';
import { ToastProvider, useToast } from './sales-admin/PesananCustomer';
import { ROLES } from './data/types';

// 1. Landing Page (Halaman Utama dengan 2 Pintu: Guest vs Staf)
import { LandingPage } from './customer/LandingPage';

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
    const rawHash = (window.location.hash || '').replace('#', '');
    if (rawHash === '/login') return 'login';
    if (rawHash === '/katalog' || rawHash.startsWith('/katalog/')) return 'catalog';
    if (rawHash.startsWith('/admin') || rawHash.startsWith('/inventory') || rawHash.startsWith('/sales') || rawHash === '/dashboard') {
      return 'dashboard';
    }
    // Saat awal buka / run web (root / atau #/), selalu masuk ke Landing Page terlebih dahulu
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleStaffLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    try {
      sessionStorage.removeItem('sales_admin_active_tab');
      sessionStorage.removeItem('super_admin_active_tab');
      sessionStorage.removeItem('stock_manager_active_tab');
    } catch {
      // ignore
    }
    logout();
    navigateTo('landing');
    addToast('Anda telah berhasil keluar dari portal staf', 'info');
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

  // Bersihkan cache view lama agar selalu konsisten mulai dari landing page saat buka web
  useEffect(() => {
    try {
      if (localStorage.getItem('farmsight_view') === 'catalog') {
        localStorage.removeItem('farmsight_view');
      }
    } catch {
      // ignore
    }
  }, []);

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
      const hash = (window.location.hash || '').replace('#', '');

      if (hash === '/' || hash === '') {
        setCurrentView('landing');
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
    let mainContent;

    // 1. Gateway Keamanan: Wajib Ganti Password jika akun berstatus must_change_password
    if (user?.must_change_password) {
      mainContent = (
        <ChangePassword
          onPasswordChanged={() => {
            navigateTo('dashboard');
            addToast('Kata sandi berhasil diperbarui', 'success');
          }}
          onLogout={handleStaffLogout}
        />
      );
    } else if (currentView === 'staff-catalog' && window.location.hash === '#/katalog-staf') {
      // 2. Hanya jika staf secara eksplisit menekan tombol "Lihat Katalog" di dalam dashboard
      mainContent = (
        <KatalogStaff
          onBackToHome={() => navigateTo('dashboard')}
          onGoToDashboard={() => navigateTo('dashboard')}
          onLogout={handleStaffLogout}
        />
      );
    } else {
      // 3. UTAMA: Masuk ke Dashboard Role Masing-Masing!
      const currentRole = String(role || user?.role || '').toUpperCase().trim();

      // Role 1: SUPER ADMIN -> Pusat Kontrol Pemilik, Manajemen Akun & Manajemen Produk
      if (currentRole.includes('SUPER') || currentRole === 'ADMIN' || currentRole === ROLES.SUPER_ADMIN) {
        mainContent = (
          <DashboardSuperAdmin
            onLogout={handleStaffLogout}
            onViewCatalog={() => navigateTo('staff-catalog')}
          />
        );
      } else if (currentRole.includes('STOCK') || currentRole.includes('GUDANG') || currentRole === ROLES.STOCK_MANAGER) {
        // Role 2: STOCK MANAGER -> Gudang, Inventaris, ROP & Mutasi
        mainContent = (
          <DashboardStockManager
            onLogout={handleStaffLogout}
            onViewCatalog={() => navigateTo('staff-catalog')}
          />
        );
      } else if (currentRole.includes('SALES') || currentRole.includes('PENJUALAN') || currentRole === ROLES.SALES_ADMIN) {
        // Role 3: SALES ADMIN -> Pesanan Customer, WA Inbox, Verifikasi Pembayaran
        mainContent = (
          <DashboardSalesAdmin
            onLogout={handleStaffLogout}
            onViewCatalog={() => navigateTo('staff-catalog')}
          />
        );
      } else {
        // Fallback jika peran tidak dikenal
        mainContent = (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f4', padding: '24px' }}>
            <h2>Peran Akun Tidak Dikenal</h2>
            <p style={{ color: '#64748b' }}>Role: {role || user?.role || 'Kosong'}</p>
            <button onClick={handleStaffLogout} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#2d6a4f', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
              Keluar Sesi
            </button>
          </div>
        );
      }
    }

    return (
      <>
        {mainContent}

        {/* MODAL DIALOG KONFIRMASI KELUAR DARI PORTAL (YA / TIDAK) */}
        {showLogoutConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ padding: '24px 24px 16px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                    Konfirmasi Keluar dari Portal?
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Apakah Anda yakin ingin keluar?
                  </p>
                </div>
              </div>

              {user && (
                <div style={{ padding: '0 24px 16px 24px' }}>
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {user.avatar || (user.name ? user.name.slice(0, 2).toUpperCase() : 'ST')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {user.roleTitle || user.role} • {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tidak, Tetap di Portal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  <LogOut size={16} />
                  <span>Ya, Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
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

  // 2. Katalog Publik Pelanggan (Hanya jika secara eksplisit membuka katalog dan bukan di root landing)
  if ((currentView === 'catalog' || window.location.hash.startsWith('#/katalog')) && window.location.hash !== '#/' && window.location.hash !== '' && window.location.hash !== '#') {
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
      onOpenCatalog={() => navigateTo('catalog')}
      onGoToLogin={() => navigateTo('login')}
      onOpenLogin={() => navigateTo('login')}
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
