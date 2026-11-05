import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  LogOut,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dummyHashPassword } from '../data/mockAuth';

export default function ChangePassword({ onPasswordChanged, onLogout }) {
  const { user, completeForceChangePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedHash, setGeneratedHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('Kata sandi baru minimal harus 8 karakter untuk memenuhi standar keamanan.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    if (newPassword === user?.password) {
      setError('Kata sandi baru tidak boleh sama dengan kata sandi sementara Anda saat ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const hash = dummyHashPassword(newPassword);
      setGeneratedHash(hash);

      // Simpan kata sandi baru, simpan hash, dan set must_change_password = false
      await completeForceChangePassword(newPassword);
      setSuccess(true);

      setTimeout(() => {
        if (onPasswordChanged) {
          onPasswordChanged();
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui kata sandi. Silakan coba lagi.');
      setIsSubmitting(false);
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
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header Alert */}
        <div
          style={{
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309' }}>
              Pemberitahuan Keamanan Sistem
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', margin: '2px 0 4px 0' }}>
              Wajib Ganti Kata Sandi
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#78350f', margin: 0, lineHeight: 1.45 }}>
              Akun Anda berstatus <strong>must_change_password = true</strong> (kata sandi baru / hasil reset oleh Super Admin). Silakan buat kata sandi baru sebelum masuk ke dashboard.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {/* User info badge */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: '#334155',
            }}
          >
            <div>Staf: <strong>{user?.name}</strong></div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Email: {user?.email} • Peran: <strong>{user?.role}</strong>
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 10px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: '0 0 6px 0' }}>
                Kata Sandi Baru Berhasil Disimpan!
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#4b5563', margin: '0 0 14px 0' }}>
                Status diubah menjadi <strong>must_change_password = false</strong>.
              </p>

              {/* Tampilan simulasi Hash yang tersimpan di sistem */}
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.74rem',
                  fontFamily: 'monospace',
                  color: '#334155',
                  wordBreak: 'break-all',
                  textAlign: 'left',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  <Hash size={13} />
                  <span>Hash Tersimpan di Database (Simulasi SHA-256):</span>
                </div>
                <div>{generatedHash}</div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                Mengalihkan ke Dashboard {user?.role}...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Input Kata Sandi Baru */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  Kata Sandi Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2d6a4f')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Gunakan kombinasi huruf dan angka minimal 8 karakter.
                </span>
              </div>

              {/* Input Konfirmasi Kata Sandi Baru */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2d6a4f')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>

              {/* Tombol Simpan & Logout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(45, 106, 79, 0.2)',
                  }}
                >
                  <Lock size={15} />
                  <span>{isSubmitting ? 'Menyimpan & Menghash Kata Sandi...' : 'Simpan Kata Sandi Baru'}</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleCancelLogout}
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={13} />
                  <span>Batal & Keluar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

