import React, { useState, useEffect } from 'react';
import {
  Mail,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPassword({ isOpen, onClose, onOpenLoginWithEmail }) {
  const { resetPasswordByEmail, users } = useAuth();
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('884920'); // Demo OTP

  // Auto-dismiss error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleSendCode = (e) => {
    e.preventDefault();
    setError('');

    const targetUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!targetUser) {
      setError('Email tidak terdaftar pada sistem Toko Farm Berkah.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setGeneratedCode(Math.floor(100000 + Math.random() * 900000).toString());
      setStep(2);
    }, 500);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError('');
    if (verificationCode.trim() !== generatedCode && verificationCode.trim() !== '123456') {
      setError('Kode verifikasi salah atau sudah kadaluarsa.');
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal harus 8 karakter sesuai standar keamanan.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordByEmail(email, newPassword);
      setLoading(false);
      setStep(4);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Gagal mengatur ulang kata sandi');
    }
  };

  const handleFinish = () => {
    onClose();
    if (onOpenLoginWithEmail) {
      onOpenLoginWithEmail(email);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflowY: 'auto',
      }}
      className="animate-fade-in"
    >
      {/* 1. TOP HEADER */}
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

      {/* 2. MAIN CENTERED CONTENT (FULL-SCREEN EXPERIENCE) */}
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
          {/* Step 1: Input Email */}
          {step === 1 && (
            <div>
              {/* Badge Icon */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#eef8f2',
                  color: '#1b4332',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '1px solid #d3ebd9',
                }}
              >
                <KeyRound size={28} />
              </div>

              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em',
                }}
              >
                Pemulihan Kata Sandi
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '28px', lineHeight: 1.5 }}>
                Masukkan alamat email akun staf Anda. Sistem akan mengirimkan kode verifikasi 6-digit.
              </p>

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

              <form onSubmit={handleSendCode} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="email"
                    required
                    placeholder="Alamat email staf"
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
                >
                  {loading ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                </button>
              </form>

              {/* Back to Login Button */}
              <div style={{ marginTop: '22px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onClose}
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
                  <span>Kembali ke Login</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Verification Code */}
          {step === 2 && (
            <div>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '1px solid #fde68a',
                }}
              >
                <ShieldCheck size={28} />
              </div>

              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em',
                }}
              >
                Kode Verifikasi
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
                Kode 6-digit telah dikirimkan ke <strong>{email}</strong>.
              </p>

              {/* Simulation hint box for easy testing */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px dashed #74c69d',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: '#1b4332',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Kode OTP Simulasi: <strong>{generatedCode}</strong></span>
                <button
                  type="button"
                  onClick={() => setVerificationCode(generatedCode)}
                  style={{
                    background: '#1b4332',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Gunakan
                </button>
              </div>

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

              <form onSubmit={handleVerifyCode} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Contoh: 123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      padding: '0 16px',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      height: '50px',
                      borderRadius: '30px',
                      border: 'none',
                      backgroundColor: '#10141a',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1f2937')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10141a')}
                  >
                    Verifikasi Kode
                  </button>

                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setStep(1);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.825rem',
                        fontWeight: 500,
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
                      <span>Kembali ke Step Sebelumnya</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <div>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#eef8f2',
                  color: '#1b4332',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '1px solid #d3ebd9',
                }}
              >
                <Lock size={28} />
              </div>

              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em',
                }}
              >
                Kata Sandi Baru
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
                Buat kata sandi baru yang aman dengan minimal 8 karakter.
              </p>

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

              <form onSubmit={handleResetPassword} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="password"
                    required
                    placeholder="Kata sandi baru (min. 8 karakter)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#1f2937';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#10141a';
                  }}
                >
                  {loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
                </button>

                {/* Back to Step 2 */}
                <div style={{ marginTop: '22px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep(2);
                    }}
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
                    <span>Kembali ke Step Sebelumnya</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '1px solid #bbf7d0',
                }}
              >
                <CheckCircle2 size={34} />
              </div>

              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em',
                }}
              >
                Kata Sandi Diperbarui!
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '28px', lineHeight: 1.5 }}>
                Akun staf Anda kini dapat diakses kembali menggunakan kata sandi yang baru.
              </p>

              <button
                type="button"
                onClick={handleFinish}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '30px',
                  border: 'none',
                  backgroundColor: '#10141a',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1f2937')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10141a')}
              >
                Masuk Sekarang
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 3. MINIMAL FOOTER */}
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
    </div>
  );
}
