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
  const { user, role, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#142019', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Toko Farm Berkah
            </div>
            <div style={{ fontSize: '0.7rem', color: '#718277' }}>
              Komplek Masnaga, Pulo Gebang, Jakarta Timur
            </div>
          </div>
        </div>

        {/* Right: Actions, Notifications, & User Profile Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quick link to view public catalog */}
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                color: '#1b4332',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#edf7f0';
                e.currentTarget.style.borderColor = '#2d6a4f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d8e2da';
              }}
              title="Buka tampilan katalog publik untuk pelanggan"
            >
              <Store size={14} color="#2d6a4f" />
              <span>Lihat Katalog Publik</span>
            </button>
          )}

          {/* FR-NA1 s/d NA5: Notifications Popover */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #d8e2da',
                backgroundColor: showNotifMenu ? '#edf7f0' : '#ffffff',
                color: '#142019',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s',
              }}
              title="Notifikasi Operasional (FR-NA)"
            >
              <Bell size={17} color="#2d6a4f" />
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                }}
              >
                3
              </span>
            </button>

            {showNotifMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 0 0 1px #e1e7e2',
                  padding: '12px',
                  zIndex: 102,
                }}
                className="animate-slide-down"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f0f4f1', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#142019' }}>Notifikasi Operasional</span>
                  <span style={{ fontSize: '0.7rem', color: '#2d6a4f', fontWeight: 600 }}>3 Baru</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {/* Notification 1: Low Stock Alert (FR-NA1) */}
                  <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700, marginBottom: '2px' }}>
                      <span>⚠️ Stok Kritis (Low Stock)</span>
                      <span style={{ fontSize: '0.68rem', color: '#991b1b' }}>10 mnt lalu</span>
                    </div>
                    <p style={{ margin: 0, color: '#450a0a', lineHeight: 1.35 }}>
                      <strong>Minuman Jelly Telang</strong> tersisa <strong>6 pcs</strong> (di bawah Safety Stock 8 pcs).
                    </p>
                  </div>

                  {/* Notification 2: Reorder Point Warning (FR-NA2) */}
                  <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 700, marginBottom: '2px' }}>
                      <span>⚡ Peringatan Reorder Point</span>
                      <span style={{ fontSize: '0.68rem', color: '#78350f' }}>1 jam lalu</span>
                    </div>
                    <p style={{ margin: 0, color: '#451a03', lineHeight: 1.35 }}>
                      <strong>Permen Lidah Buaya</strong> mencapai batas ROP (12 pcs). Disarankan order restock.
                    </p>
                  </div>

                  {/* Notification 3: New Order (FR-NA3) */}
                  <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, marginBottom: '2px' }}>
                      <span>🛒 Pesanan Baru Masuk</span>
                      <span style={{ fontSize: '0.68rem', color: '#166534' }}>2 jam lalu</span>
                    </div>
                    <p style={{ margin: 0, color: '#052e16', lineHeight: 1.35 }}>
                      Pesanan <strong>ORD-2026-081</strong> (10x Keripik Labu) menunggu verifikasi sales.
                    </p>
                  </div>
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
