import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  LogOut,
  KeyRound,
  User,
  Bell,
  ChevronDown,
  Shield,
  Package,
  ShoppingCart,
  Check,
  Building2,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';
import RoleBadge from '../auth/RoleBadge';
import ChangePassword from '../auth/ChangePassword';

export default function Navbar({ onViewCatalog }) {
  const { user, role, logout, quickLogin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const profileRef = useRef(null);
  const roleRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = async (targetRole) => {
    setShowRoleMenu(false);
    try {
      await quickLogin(targetRole);
      setToastMsg(`Beralih peran ke ${ROLE_DETAILS[targetRole].name}`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e1e7e2',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Brand Identity with Authentic Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/images/logo-farm-berkah.jpg"
              alt="Logo Toko Farm Berkah"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                objectFit: 'contain',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                padding: '2px',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#142019', letterSpacing: '-0.02em' }}>
                  Toko Farm Berkah
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    backgroundColor: '#f0fdf4',
                    color: '#2d6a4f',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  Sistem Staf
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#718277' }}>
                Komplek Masnaga, Pulo Gebang, Jakarta Timur
              </div>
            </div>
          </div>

          {/* Quick link to view public catalog */}
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid #e1e7e2',
                background: '#f8faf8',
                color: '#2d6a4f',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Buka tampilan katalog publik untuk pelanggan"
            >
              <Store size={14} />
              <span>Lihat Katalog Publik</span>
            </button>
          )}
        </div>

        {/* Right: Quick Role Switcher, Notification, and User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Quick Role Switcher Dropdown */}
          <div style={{ position: 'relative' }} ref={roleRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d9d3',
                background: '#f8faf8',
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#142019',
              }}
              title="Ganti peran untuk pengujian akses RBAC"
            >
              <span style={{ fontSize: '0.75rem', color: '#718277' }}>Peran Aktif:</span>
              <RoleBadge role={role} size="sm" />
              <ChevronDown size={14} color="#718277" />
            </button>

            {showRoleMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '280px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px #e1e7e2',
                  padding: '8px',
                  zIndex: 101,
                }}
                className="animate-slide-down"
              >
                <div style={{ padding: '6px 10px 8px 10px', borderBottom: '1px solid #f0f4f1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718277', textTransform: 'uppercase' }}>
                    Ganti Peran Pengguna (RBAC Demo)
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleRoleSwitch(ROLES.SUPER_ADMIN)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: role === ROLES.SUPER_ADMIN ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={16} color="#1b4332" />
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#142019' }}>Super Admin</div>
                        <div style={{ fontSize: '0.7rem', color: '#718277' }}>Ibu Intan Permatasari</div>
                      </div>
                    </div>
                    {role === ROLES.SUPER_ADMIN && <Check size={14} color="#16a34a" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch(ROLES.STOCK_MANAGER)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: role === ROLES.STOCK_MANAGER ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} color="#065f46" />
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#142019' }}>Stock Manager</div>
                        <div style={{ fontSize: '0.7rem', color: '#718277' }}>Budi Santoso</div>
                      </div>
                    </div>
                    {role === ROLES.STOCK_MANAGER && <Check size={14} color="#16a34a" />}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch(ROLES.SALES_ADMIN)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: role === ROLES.SALES_ADMIN ? '#fffbeb' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShoppingCart size={16} color="#92400e" />
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#142019' }}>Sales Admin</div>
                        <div style={{ fontSize: '0.7rem', color: '#718277' }}>Siti Rahmawati</div>
                      </div>
                    </div>
                    {role === ROLES.SALES_ADMIN && <Check size={14} color="#16a34a" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 8px 4px 4px',
                borderRadius: '30px',
                border: '1px solid #e1e7e2',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#2d6a4f',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                }}
              >
                {user?.avatar || 'FB'}
              </div>
              <div style={{ textAlign: 'left', marginRight: '4px' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#142019', lineHeight: 1.1 }}>
                  {user?.name || 'Pengguna'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#718277' }}>
                  {user?.roleTitle || 'Staff'}
                </div>
              </div>
              <ChevronDown size={14} color="#718277" />
            </button>

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '260px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px #e1e7e2',
                  padding: '8px',
                  zIndex: 101,
                }}
                className="animate-slide-down"
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f4f1' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#142019' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#718277' }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <RoleBadge role={role} size="sm" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsChangePassOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#142019',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <KeyRound size={15} color="#2d6a4f" />
                    <span>Ubah Kata Sandi</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={15} color="#dc2626" />
                    <span>Keluar dari Sistem</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1b4332',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
            fontSize: '0.875rem',
            fontWeight: 600,
            zIndex: 9999,
          }}
          className="animate-slide-down"
        >
          {toastMsg}
        </div>
      )}

      {/* Change Password Dialog */}
      <ChangePassword
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        onSuccess={(msg) => setToastMsg(msg)}
      />
    </>
  );
}
