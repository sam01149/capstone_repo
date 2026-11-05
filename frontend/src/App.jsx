import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './data/mockAuth';
import Catalog from './components/public/Catalog';
import Login from './components/auth/Login';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AccessDenied from './components/layout/AccessDenied';
import Dashboard from './components/dashboard/Dashboard';
import Users from './components/users/Users';
import Products from './components/products/Products';
import Operations from './components/modules/Operations';

function MainApp() {
  const { isAuthenticated, loading, isRole, logout } = useAuth();
  
  // Persist currentView: if authenticated, stay on dashboard; if not, show catalog
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('farmsight_current_view');
    if (saved && (saved === 'catalog' || saved === 'login' || saved === 'dashboard')) {
      return saved;
    }
    return isAuthenticated ? 'dashboard' : 'catalog';
  });

  // Persist active operational tab (e.g. 'orders' for Sales Admin)
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('farmsight_active_tab') || 'orders';
  });

  const handleSetCurrentView = (view) => {
    setCurrentView(view);
    localStorage.setItem('farmsight_current_view', view);
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('farmsight_active_tab', tab);
  };

  const handleStaffLogout = () => {
    logout();
    handleSetCurrentView('catalog');
    handleSelectTab('dashboard');
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

  // 1. Default Public Catalog View (FR-PP-1 s/d FR-PP-5)
  // Shown when user explicitly navigates to catalog or when not authenticated and on catalog
  if (currentView === 'catalog' && !isAuthenticated) {
    return (
      <Catalog
        onOpenLogin={() => handleSetCurrentView('login')}
        onGoToDashboard={() => handleSetCurrentView('dashboard')}
      />
    );
  }

  // Allow authenticated staff to view public catalog, with a quick return to dashboard
  if (currentView === 'catalog' && isAuthenticated) {
    return (
      <Catalog
        onOpenLogin={() => handleSetCurrentView('login')}
        onGoToDashboard={() => handleSetCurrentView('dashboard')}
      />
    );
  }

  // 2. Internal Staff Login View (FR-A-1)
  if (currentView === 'login' || !isAuthenticated) {
    return (
      <Login
        onBackToCatalog={() => handleSetCurrentView('catalog')}
        onLoginSuccess={() => {
          handleSetCurrentView('dashboard');
          handleSelectTab('orders');
        }}
      />
    );
  }

  // 3. Authenticated Internal Dashboard & Management System
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSelectTab} />;

      case 'products':
        return <Products onBackToDashboard={() => handleSelectTab('dashboard')} />;

      case 'users':
        if (!isRole(ROLES.SUPER_ADMIN)) {
          return (
            <AccessDenied
              featureName="Manajemen Pengguna & Otorisasi Sistem"
              onBackToDashboard={() => handleSelectTab('dashboard')}
            />
          );
        }
        return <Users />;

      default:
        return (
          <Operations
            tabId={activeTab}
            onBackToDashboard={() => handleSelectTab('dashboard')}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f6f4' }}>
      <Navbar
        onViewCatalog={() => handleSetCurrentView('catalog')}
        onLogout={handleStaffLogout}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleStaffLogout}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
