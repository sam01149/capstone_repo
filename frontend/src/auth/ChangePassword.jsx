import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword({ onPasswordChanged, onLogout }) {
  const { user, completeForceChangePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (msg) => {
    setToastMessage(msg);
    setToastKey((prev) => prev + 1);
  };

  // Auto-dismiss pesan pemberitahuan setelah 3 detik
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastKey, toastMessage]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      showNotification('Kata sandi baru minimal harus 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (newPassword === user?.password) {
      showNotification('Kata sandi baru tidak boleh sama dengan kata sandi sebelumnya.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeForceChangePassword(newPassword);
      setSuccess(true);

      setTimeout(() => {
        if (onPasswordChanged) {
          onPasswordChanged();
        }
      }, 1200);
    } catch (err) {
      setIsSubmitting(false);
      showNotification(err.message || 'Gagal memperbarui kata sandi. Silakan coba lagi.');
    }
  };

  const handleCancelLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
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
      {/* Header Navigasi Kiri Atas */}
      <header
        style={{
          height: '72px',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={handleCancelLogout}
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
          <span>Kembali ke Halaman Masuk</span>
        </button>
      </header>

      {/* Konten Utama Layar Penuh (Style Login Minimalis & Manusiawi) */}
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
            maxWidth: '400px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {/* Logo Toko Farm Berkah */}
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

          {/* Judul & Keterangan Alami (Manusiawi & Non-AI) */}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '8px',
              letterSpacing: '-0.025em',
            }}
          >
            Atur Kata Sandi Baru
          </h1>
          <p
            style={{
              fontSize: '0.88rem',
              color: '#64748b',
              marginBottom: '26px',
              lineHeight: 1.5,
            }}
          >
            Untuk menjaga keamanan akun Anda, silakan perbarui kata sandi sebelum melanjutkan.
          </p>

          {/* Informasi Akun Staf Sederhana */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '22px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Tampilan Sukses */}
          {success ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: '#f0fdf4',
                borderRadius: '16px',
                border: '1.5px solid #bbf7d0',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', margin: '0 0 6px 0' }}>
                Kata Sandi Berhasil Diperbarui
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#15803d', margin: 0 }}>
                Menyiapkan dashboard Anda, mohon tunggu...
              </p>
            </div>
          ) : (
            /* Form Atur Kata Sandi Baru */
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: '6px',
                  }}
                >
                  Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password-input"
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#1b4332')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Minimal 8 karakter.
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: '6px',
                  }}
                >
                  Konfirmasi Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#1b4332')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(27, 67, 50, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Lock size={15} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Masuk ke Dashboard'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelLogout}
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  Batal & Keluar
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Pemberitahuan Melayang Selama 3 Detik */}
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
