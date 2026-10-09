import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './data/mockAuth';
import PublicCatalog from './components/public/PublicCatalog';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AccessDenied from './components/layout/AccessDenied';
import OverviewDashboard from './components/dashboard/OverviewDashboard';
import UserManagementView from './components/users/UserManagementView';
import ModulePreview from './components/modules/ModulePreview';

function MainApp() {
  const { isAuthenticated, loading, role, isRole } = useAuth();
  // Current view modes: 'catalog' (public default), 'login' (staff auth), 'dashboard' (internal ops)
  const [currentView, setCurrentView] = useState('catalog');
  const [activeTab, setActiveTab] = useState('dashboard');

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
  if (currentView === 'catalog') {
    return (
      <PublicCatalog
        onOpenLogin={() => setCurrentView('login')}
        onGoToDashboard={() => setCurrentView('dashboard')}
      />
    );
  }

  // 2. Internal Staff Login View (FR-A-1)
  if (currentView === 'login' || !isAuthenticated) {
    return (
      <LoginForm
        onBackToCatalog={() => setCurrentView('catalog')}
        onLoginSuccess={() => setCurrentView('dashboard')}
      />
    );
  }

  // 3. Authenticated Internal Dashboard & Management System
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard onNavigate={setActiveTab} />;

      case 'users':
        if (!isRole(ROLES.SUPER_ADMIN)) {
          return (
            <AccessDenied
              featureName="Manajemen Pengguna & Otorisasi Sistem"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          );
        }
        return <UserManagementView />;

      default:
        return (
          <ModulePreview
            tabId={activeTab}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f6f4' }}>
      <Navbar onViewCatalog={() => setCurrentView('catalog')} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
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
