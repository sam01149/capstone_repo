import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LupaPassword from './LupaPassword';

export default function Login({ onBackToCatalog, onBackToHome, onLoginSuccess, onRequirePasswordChange }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const showNotification = (msg) => {
    setToastMessage(msg);
    setToastKey((prev) => prev + 1);
  };

  // Auto-dismiss pemberitahuan setelah 3 detik
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastKey, toastMessage]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!email.trim() || !password) {
      showNotification('Email atau kata sandi tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      setLoading(false);

      try {
        sessionStorage.removeItem('sales_admin_active_tab');
        sessionStorage.removeItem('super_admin_active_tab');
        sessionStorage.removeItem('stock_manager_active_tab');
      } catch {
        // ignore
      }
      localStorage.setItem('farmsight_view', 'dashboard');
      window.location.hash = '#/dashboard';

      if (loggedInUser?.must_change_password) {
        if (onRequirePasswordChange) {
          onRequirePasswordChange(loggedInUser);
        } else if (onLoginSuccess) {
          onLoginSuccess(loggedInUser);
        }
      } else {
        if (onLoginSuccess) {
          onLoginSuccess(loggedInUser);
        }
      }
    } catch (err) {
      setLoading(false);
      const errMsg = err?.message || 'Email atau kata sandi salah. Silakan coba lagi.';
      showNotification(errMsg);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Left Navigation: Kembali ke Beranda / Katalog */}
      <header
        style={{
          height: '72px',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={onBackToHome || onBackToCatalog}
          id="btn-back-to-home"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#475569';
          }}
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Beranda</span>
        </button>
      </header>

      {/* Main Centered Login Card (Dribbble Minimalist Style) */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 20px 60px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            margin: '0 auto',
            textAlign: 'center',
          }}
          className="animate-fade-in"
        >
          {/* Centered Authentic Toko Farm Berkah Logo Badge */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              margin: '0 auto 20px auto',
              border: '1.5px solid #e1e7e2',
              boxShadow: '0 4px 16px rgba(27, 67, 50, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            <img
              src="/images/logo-farm-berkah.jpg"
              alt="Logo Toko Farm Berkah"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '32px',
              letterSpacing: '-0.025em',
            }}
          >
            Welcome back
          </h1>

          {/* Form Login */}
          <form onSubmit={handleSubmit} noValidate style={{ textAlign: 'left' }}>
            {/* Input 1: Alamat Email / Username */}
            <div style={{ marginBottom: '16px' }}>
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                placeholder="Alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '0 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  fontSize: '0.925rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f172a';
                  e.target.style.boxShadow = '0 0 0 1px #0f172a';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Input 2: Kata Sandi */}
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '0 46px 0 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  fontSize: '0.925rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f172a';
                  e.target.style.boxShadow = '0 0 0 1px #0f172a';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Tombol Masuk (Black Pill Button Dribbble style) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '30px',
                border: 'none',
                backgroundColor: '#10141a',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#1f2937';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#10141a';
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.99)';
              }}
              onMouseUp={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          {/* Action Link: Lupa kata sandi */}
          <div
            style={{
              marginTop: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.825rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsForgotOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer
        style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}
      >
        &copy; 2026 Toko Farm Berkah. Hak Cipta Dilindungi.
      </footer>

      {/* Modal Pusat Bantuan Lupa Kata Sandi Staf */}
      <LupaPassword
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />

      {/* Pemberitahuan Melayang Selama 3 Detik di Atas Layar */}
      {toastMessage && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            backgroundColor: '#ffffff',
            border: '1.5px solid #ef4444',
            borderLeft: '5px solid #dc2626',
            color: '#1f2937',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -5px rgba(220, 38, 38, 0.3), 0 4px 10px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '92%',
            fontSize: '0.88rem',
            fontWeight: 600,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={18} color="#dc2626" />
          </div>
          <div>
            <div style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.8rem' }}>Pemberitahuan</div>
            <div style={{ color: '#374151', fontSize: '0.86rem' }}>{toastMessage}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '2px',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
