import React from 'react';
import { ShieldAlert, ArrowLeft, KeyRound, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';
import RoleBadge from '../auth/RoleBadge';

export default function AccessDenied({ featureName = 'Modul Ini', onBackToDashboard }) {
  const { role, quickLogin } = useAuth();
  const currentRoleConfig = ROLE_DETAILS[role];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
        Akses Ditolak (403 Forbidden)
      </h2>

      <p style={{ fontSize: '0.925rem', color: '#48564e', maxWidth: '520px', lineHeight: 1.6, marginBottom: '20px' }}>
        Peran Anda saat ini (<strong>{currentRoleConfig?.name}</strong>) tidak memiliki izin otorisasi untuk mengakses <strong>{featureName}</strong>. Pembatasan ini sesuai dengan spesifikasi hak akses peran (FR-A-6).
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#ffffff',
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid #e1e7e2',
          marginBottom: '28px',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: '#718277' }}>Peran Anda:</span>
        <RoleBadge role={role} size="md" />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #d1d9d3',
            background: '#ffffff',
            color: '#142019',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Dashboard</span>
        </button>

        {role !== ROLES.SUPER_ADMIN && (
          <button
            onClick={() => quickLogin(ROLES.SUPER_ADMIN)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#2d6a4f',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <UserCheck size={16} />
            <span>Masuk sebagai Super Admin</span>
          </button>
        )}
      </div>
    </div>
  );
}
