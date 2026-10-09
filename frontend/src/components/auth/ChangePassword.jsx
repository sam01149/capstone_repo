import React, { useState } from 'react';
import { KeyRound, CheckCircle2, X, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ChangePassword({ isOpen, onClose, onSuccess }) {
  const { user, changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: 'Kosong', color: '#9ca3af' };
    if (pass.length < 8) return { score: 1, text: 'Kurang (Min 8 karakter)', color: '#ef4444' };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

    if (hasLetters && hasNumbers && hasSpecial) return { score: 3, text: 'Sangat Kuat', color: '#16a34a' };
    if (hasLetters && hasNumbers) return { score: 2, text: 'Cukup Kuat', color: '#f59e0b' };
    return { score: 1, text: 'Sedang', color: '#f59e0b' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal harus 8 karakter (sesuai standar NFR-SEC-1).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (oldPassword === newPassword) {
      setError('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccess) onSuccess('Kata sandi berhasil diperbarui.');
        onClose();
      }, 1400);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Gagal mengubah kata sandi.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 41, 30, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          border: '1px solid #e1e7e2',
        }}
        className="animate-fade-in"
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f4f6f4',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#718277',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#d8f3dc',
              color: '#1b4332',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#142019' }}>
              Ubah Kata Sandi
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#48564e' }}>
              Akun: <strong>{user?.email}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#16a34a',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>Kata sandi berhasil diperbarui!</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#142019', marginBottom: '6px' }}>
              Kata Sandi Saat Ini
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                placeholder="Masukkan kata sandi saat ini"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d9d3',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#718277',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#142019', marginBottom: '6px' }}>
              Kata Sandi Baru
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d9d3',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />

            {/* Strength meter */}
            {newPassword && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ flex: 1, background: strength.score >= 1 ? strength.color : '#e5e7eb' }} />
                  <div style={{ flex: 1, background: strength.score >= 2 ? strength.color : '#e5e7eb' }} />
                  <div style={{ flex: 1, background: strength.score >= 3 ? strength.color : '#e5e7eb' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: strength.color, marginTop: '4px', fontWeight: 600 }}>
                  Kekuatan: {strength.text}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#142019', marginBottom: '6px' }}>
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              placeholder="Ketik ulang kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d9d3',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #d1d9d3',
                background: '#ffffff',
                color: '#48564e',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={{
                flex: 1.5,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#2d6a4f',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
