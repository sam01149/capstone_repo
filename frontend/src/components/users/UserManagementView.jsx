import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  KeyRound,
  Power,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';
import RoleBadge from '../auth/RoleBadge';

export default function UserManagementView() {
  const {
    users,
    createUser,
    updateUser,
    toggleUserStatus,
    adminResetUserPassword,
    user: currentUser,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('farm12345');
  const [newRole, setNewRole] = useState(ROLES.STOCK_MANAGER);
  const [newRoleTitle, setNewRoleTitle] = useState('Staff Persediaan');
  const [newPhone, setNewPhone] = useState('+62 8');

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.roleTitle.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('Kata sandi awal minimal 8 karakter.');
      return;
    }

    try {
      await createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        roleTitle: newRoleTitle,
        phone: newPhone,
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('farm12345');
      setNewRole(ROLES.STOCK_MANAGER);
      setNewRoleTitle('Staff Persediaan');
      setNewPhone('+62 8');
      showFeedback('Pengguna baru berhasil ditambahkan ke sistem.');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menambahkan pengguna.');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await toggleUserStatus(userId);
      showFeedback('Status akun pengguna berhasil diperbarui.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    if (newAdminPassword.length < 8) {
      alert('Kata sandi baru minimal 8 karakter');
      return;
    }

    try {
      await adminResetUserPassword(selectedUserForReset.id, newAdminPassword);
      setIsResetPassModalOpen(false);
      setSelectedUserForReset(null);
      setNewAdminPassword('');
      showFeedback(`Kata sandi untuk ${selectedUserForReset.name} berhasil diatur ulang.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChangeDirect = async (userId, targetRole) => {
    try {
      await updateUser(userId, { role: targetRole });
      showFeedback('Peran pengguna berhasil diperbarui.');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '24px' }} className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019' }}>
              Manajemen Pengguna & Otorisasi
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#d8f3dc',
                color: '#1b4332',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              FR-UR-1 s/d FR-UR-7
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#48564e' }}>
            Kelola data akun pegawai Toko Farm Berkah, penetapan peran (Role-Based Access Control), dan reset kata sandi.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2d6a4f',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(45, 106, 79, 0.2)',
          }}
        >
          <UserPlus size={18} />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Success Notification */}
      {feedbackMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            color: '#16a34a',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}
          className="animate-fade-in"
        >
          <CheckCircle2 size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#718277',
            }}
          />
          <input
            type="text"
            placeholder="Cari nama, email, atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '10px',
              border: '1px solid #e1e7e2',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#718277', fontWeight: 600 }}>Filter Peran:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid #e1e7e2',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
              color: '#142019',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Semua Peran ({users.length})</option>
            <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
            <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
            <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e1e7e2',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 18px' }}>Pengguna</th>
                <th style={{ padding: '14px 18px' }}>Kontak & Email</th>
                <th style={{ padding: '14px 18px' }}>Peran (Role)</th>
                <th style={{ padding: '14px 18px' }}>Status Akun</th>
                <th style={{ padding: '14px 18px' }}>Aktivitas Terakhir</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Aksi Otorisasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#718277' }}>
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isAktif = u.status === 'Aktif';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f0f4f1',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafcfa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: u.role === ROLES.SUPER_ADMIN ? '#1b4332' : u.role === ROLES.STOCK_MANAGER ? '#065f46' : '#92400e',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {u.avatar}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#142019', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '0.68rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                                  Anda
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#718277' }}>
                              {u.roleTitle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#142019' }}>
                            <Mail size={13} color="#718277" />
                            <span>{u.email}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#718277', fontSize: '0.78rem' }}>
                            <Phone size={13} />
                            <span>{u.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChangeDirect(u.id, e.target.value)}
                          disabled={isCurrent}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d9d3',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                          <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
                          <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isAktif ? '#f0fdf4' : '#fef2f2',
                            color: isAktif ? '#16a34a' : '#dc2626',
                            border: `1px solid ${isAktif ? '#bbf7d0' : '#fee2e2'}`,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAktif ? '#16a34a' : '#dc2626' }} />
                          {u.status}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#142019' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {u.lastLogin || '-'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#718277' }}>
                          Dibuat: {u.createdAt}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setIsResetPassModalOpen(true);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d9d3',
                              backgroundColor: '#ffffff',
                              color: '#2d6a4f',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Reset Kata Sandi Pengguna"
                          >
                            <KeyRound size={13} />
                            <span>Reset PW</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            disabled={isCurrent}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: isAktif ? '#fee2e2' : '#dcfce7',
                              color: isAktif ? '#dc2626' : '#16a34a',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              opacity: isCurrent ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={isAktif ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
                          >
                            <Power size={13} />
                            <span>{isAktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Pengguna Baru */}
      {isAddModalOpen && (
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
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
            className="animate-fade-in"
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#142019' }}>
                  Tambah Pengguna Sistem
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#718277' }}>
                  Buat akun baru untuk staf Toko Farm Berkah (FR-UR-2)
                </p>
              </div>
            </div>

            {errorMsg && (
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
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                    Email Sistem
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@farmberkah.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+62 8..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                    Peran / Role (FR-UR-5)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value);
                      if (e.target.value === ROLES.SUPER_ADMIN) setNewRoleTitle('Pemilik / Manajemen');
                      if (e.target.value === ROLES.STOCK_MANAGER) setNewRoleTitle('Staff Persediaan & Gudang');
                      if (e.target.value === ROLES.SALES_ADMIN) setNewRoleTitle('Staff Penjualan & Kasir');
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                  >
                    <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
                    <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
                    <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                    Jabatan Operasional
                  </label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                  Kata Sandi Awal (Min. 8 Karakter)
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d9d3', background: '#fff', color: '#48564e', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password Pengguna */}
      {isResetPassModalOpen && selectedUserForReset && (
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
            if (e.target === e.currentTarget) setIsResetPassModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#142019' }}>
                  Reset Kata Sandi
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#718277' }}>
                  Akun: <strong>{selectedUserForReset.email}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#142019', marginBottom: '4px' }}>
                  Kata Sandi Baru
                </label>
                <input
                  type="text"
                  required
                  placeholder="Min. 8 karakter (misal: farm2026!)"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d9d3', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #d1d9d3', background: '#fff', color: '#48564e', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1.5, padding: '9px', borderRadius: '8px', border: 'none', background: '#2d6a4f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Setel Ulang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
