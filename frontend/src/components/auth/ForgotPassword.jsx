import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Copy,
  Check,
  Mail,
  Phone,
  ShieldAlert,
} from 'lucide-react';

export default function ForgotPassword({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const superAdmin = {
    name: 'Ibu Intan Permatasari',
    role: 'Pemilik & Super Admin',
    email: 'admin@farmberkah.com',
    phone: '+62 812-1614-6510',
    phoneClean: '6281216146510',
  };

  const requestTemplate = `Halo Ibu Intan (Super Admin Toko Farm Berkah), saya staf operasional ingin mengajukan permohonan reset kata sandi akun FarmSight saya. Mohon bantuan untuk mengatur ulang kata sandi saya. Terima kasih.`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(requestTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const waUrl = `https://wa.me/${superAdmin.phoneClean}?text=${encodeURIComponent(requestTemplate)}`;

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
      {/* Top Left Navigation Header */}
      <header
        style={{
          height: '72px',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          id="btn-back-to-login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '0.85rem',
            fontWeight: 500,
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

      {/* Main Centered Content */}
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
          {/* Authentic Farm Berkah Logo Badge */}
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

          {/* Title & Description */}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '10px',
              letterSpacing: '-0.025em',
            }}
          >
            Lupa kata sandi?
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              lineHeight: 1.6,
              marginBottom: '26px',
            }}
          >
            Pengaturan ulang kata sandi akun staf dikelola secara terpusat oleh <strong>Super Admin</strong>.
          </p>

          {/* Sleek Contact & Info Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                IP
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', truncate: true }}>
                    {superAdmin.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      backgroundColor: '#d8f3dc',
                      color: '#1b4332',
                      padding: '2px 7px',
                      borderRadius: '6px',
                    }}
                  >
                    Super Admin
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Pemilik Toko Farm Berkah
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                color: '#475569',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} color="#64748b" />
                <span>{superAdmin.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} color="#64748b" />
                <span>{superAdmin.email}</span>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '12px',
                marginBottom: 0,
                lineHeight: 1.45,
              }}
            >
              Hubungi Super Admin agar kata sandi Anda disetel ulang ke sandi default atau dibuatkan sandi baru.
            </p>
          </div>

          {/* Actions: Black Pill Button matching LoginForm */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '30px',
                backgroundColor: '#10141a',
                color: '#ffffff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '0.925rem',
                fontWeight: 600,
                transition: 'background-color 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1f2937')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10141a')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <MessageCircle size={18} />
              <span>Hubungi via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '30px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: copied ? '#16a34a' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Pesan Permohonan Tersalin!' : 'Salin Format Pesan Permohonan'}</span>
            </button>
          </div>

          {/* Action Link: Kembali ke Login */}
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.825rem',
            }}
          >
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
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              Kembali ke Login
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
          flexShrink: 0,
        }}
      >
        &copy; 2026 Toko Farm Berkah. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
