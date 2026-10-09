import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ForgotPassword from './ForgotPassword';

export default function LoginForm({ onBackToCatalog, onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Auto-dismiss error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Harap masukkan alamat email dan kata sandi.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Quick 500ms verification animation before entering dashboard
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }, 500);
    } catch (err) {
      setError(err.message || 'Gagal masuk. Periksa email dan kata sandi Anda.');
      setLoading(false);
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
      {/* Top Bar with Brand */}
      <header
        style={{
          height: '72px',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Brand Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/images/logo-farm-berkah.jpg"
            alt="Logo Toko Farm Berkah"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid #d8e2da',
            }}
          />
          <span
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}
          >
            Toko Farm Berkah
          </span>
        </div>
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

          {/* Error Message */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '0.825rem',
                marginBottom: '20px',
                textAlign: 'left',
              }}
              className="animate-fade-in"
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {/* Input 1: Alamat Email */}
            <div style={{ marginBottom: '16px' }}>
              <input
                id="login-email"
                type="email"
                required
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
                required
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

          {/* Action Links: Kembali ke Katalog & Lupa kata sandi */}
          <div
            style={{
              marginTop: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '0.825rem',
            }}
          >
            {onBackToCatalog && (
              <>
                <button
                  type="button"
                  onClick={onBackToCatalog}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 500,
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Katalog</span>
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
              </>
            )}

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

      {/* Forgot Password Modal/Screen */}
      <ForgotPassword
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onOpenLoginWithEmail={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
        }}
      />
    </div>
  );
}

