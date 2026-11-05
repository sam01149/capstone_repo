import React, { useState } from 'react';
import {
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
  Copy,
  Eye,
  EyeOff,
  MessageCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';
import RoleBadge from '../auth/RoleBadge';

export default function Users() {
  const {
    users,
    createUser,
    updateUser,
    toggleUserStatus,
    adminResetUserPassword,
    defaultPassword = 'farm12345',
    user: currentUser,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [resetMode, setResetMode] = useState('DEFAULT'); // 'DEFAULT' or 'CUSTOM'
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [isCopiedCredential, setIsCopiedCredential] = useState(false);
  const [resetError, setResetError] = useState('');
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

  const openResetModal = (targetUser) => {
    setSelectedUserForReset(targetUser);
    setResetMode('DEFAULT');
    setNewAdminPassword(defaultPassword);
    setShowAdminPassword(false);
    setResetSuccessData(null);
    setIsCopiedCredential(false);
    setResetError('');
    setIsResetPassModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'Farm#';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminPassword(res);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!selectedUserForReset) return;

    const passwordToSet = resetMode === 'DEFAULT' ? defaultPassword : newAdminPassword.trim();

    if (!passwordToSet || passwordToSet.length < 8) {
      setResetError('Kata sandi baru minimal harus 8 karakter.');
      return;
    }

    try {
      await adminResetUserPassword(selectedUserForReset.id, passwordToSet);
      setResetSuccessData({
        user: selectedUserForReset,
        password: passwordToSet,
        mode: resetMode,
      });
      showFeedback(`Kata sandi untuk ${selectedUserForReset.name} berhasil diatur ulang.`);
    } catch (err) {
      setResetError(err.message || 'Gagal mengatur ulang kata sandi');
    }
  };

  const handleCopyCredential = (userData, pwd) => {
    const text = `Halo ${userData.name}, berikut kredensial baru akun staf FarmSight Anda (Toko Farm Berkah):\n\nEmail: ${userData.email}\nKata Sandi: ${pwd}\n\nSilakan segera login di aplikasi web FarmSight.`;
    navigator.clipboard.writeText(text);
    setIsCopiedCredential(true);
    setTimeout(() => setIsCopiedCredential(false), 2500);
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
                            onClick={() => openResetModal(u)}
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

      {/* Modal: Reset Password Pengguna oleh Super Admin */}
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
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              padding: '26px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              border: '1px solid #e1e7e2',
            }}
            className="animate-fade-in"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsResetPassModalOpen(false)}
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

            {resetSuccessData ? (
              /* Success View After Reset */
              <div style={{ textAlign: 'center', padding: '10px 4px 6px 4px' }} className="animate-fade-in">
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', marginBottom: '6px' }}>
                  Kata Sandi Berhasil Diatur Ulang!
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
                  Akun staf <strong>{resetSuccessData.user.name}</strong> kini dapat diakses kembali menggunakan kredensial berikut:
                </p>

                {/* Credential Card */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Email Akun:
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      {resetSuccessData.user.email}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Kata Sandi Baru:
                    </span>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#1b4332',
                        backgroundColor: '#d8f3dc',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {resetSuccessData.password}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyCredential(resetSuccessData.user, resetSuccessData.password)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: isCopiedCredential ? '#16a34a' : '#1b4332',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {isCopiedCredential ? <Check size={18} /> : <Copy size={18} />}
                    <span>{isCopiedCredential ? 'Format Kredensial Tersalin!' : 'Salin Kredensial Staf'}</span>
                  </button>

                  {resetSuccessData.user.phone && resetSuccessData.user.phone !== '-' && (
                    <a
                      href={`https://wa.me/${resetSuccessData.user.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Halo ${resetSuccessData.user.name}, berikut kata sandi baru untuk akun FarmSight Anda di Toko Farm Berkah:\n\nEmail: ${resetSuccessData.user.email}\nKata Sandi: ${resetSuccessData.password}\n\nSilakan segera login di aplikasi web.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '10px',
                        backgroundColor: '#25D366',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <MessageCircle size={18} />
                      <span>Kirim ke WhatsApp Staf ({resetSuccessData.user.phone})</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassModalOpen(false);
                      setResetSuccessData(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      border: 'none',
                      color: '#475569',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              /* Reset Password Form */
              <div>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#d8f3dc',
                      color: '#1b4332',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <KeyRound size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Reset Kata Sandi Staf
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#718277', margin: '2px 0 0 0' }}>
                      Kendali Otorisasi Akun oleh Super Admin
                    </p>
                  </div>
                </div>

                {/* Target User Info Badge */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#1b4332',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                      }}
                    >
                      {selectedUserForReset.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {selectedUserForReset.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {selectedUserForReset.email}
                      </div>
                    </div>
                  </div>
                  <RoleBadge role={selectedUserForReset.role} />
                </div>

                {resetError && (
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
                      marginBottom: '16px',
                    }}
                    className="animate-fade-in"
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{resetError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPasswordSubmit}>
                  {/* Mode Selector */}
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '8px' }}>
                    Pilih Metode Reset:
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    {/* Option 1: Default Password */}
                    <div
                      onClick={() => setResetMode('DEFAULT')}
                      style={{
                        border: `1.5px solid ${resetMode === 'DEFAULT' ? '#2d6a4f' : '#e2e8f0'}`,
                        backgroundColor: resetMode === 'DEFAULT' ? '#f0fdf4' : '#ffffff',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="radio"
                            name="resetMode"
                            checked={resetMode === 'DEFAULT'}
                            onChange={() => setResetMode('DEFAULT')}
                            style={{ accentColor: '#2d6a4f', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#142019' }}>
                            Kembalikan ke Kata Sandi Default
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#1b4332',
                            backgroundColor: '#d8f3dc',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {defaultPassword}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 24px', lineHeight: 1.4 }}>
                        Sandi akan langsung direset ke nilai standar sistem (<strong>{defaultPassword}</strong>).
                      </p>
                    </div>

                    {/* Option 2: Custom / Isi Ulang Sendiri */}
                    <div
                      onClick={() => setResetMode('CUSTOM')}
                      style={{
                        border: `1.5px solid ${resetMode === 'CUSTOM' ? '#2d6a4f' : '#e2e8f0'}`,
                        backgroundColor: resetMode === 'CUSTOM' ? '#f0fdf4' : '#ffffff',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="resetMode"
                          checked={resetMode === 'CUSTOM'}
                          onChange={() => setResetMode('CUSTOM')}
                          style={{ accentColor: '#2d6a4f', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#142019' }}>
                          Tentukan Kata Sandi Baru (Isi Ulang Sendiri)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 24px', lineHeight: 1.4 }}>
                        Super Admin dapat mengetikkan kata sandi baru secara khusus untuk staf.
                      </p>

                      {resetMode === 'CUSTOM' && (
                        <div style={{ marginTop: '12px', marginLeft: '24px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <input
                              type={showAdminPassword ? 'text' : 'password'}
                              required={resetMode === 'CUSTOM'}
                              placeholder="Minimal 8 karakter"
                              value={newAdminPassword}
                              onChange={(e) => setNewAdminPassword(e.target.value)}
                              style={{
                                width: '100%',
                                height: '42px',
                                padding: '0 40px 0 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.875rem',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminPassword(!showAdminPassword)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                              }}
                            >
                              {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#e2e8f0',
                              border: 'none',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Sparkles size={13} color="#2d6a4f" />
                            <span>Acak Sandi Aman Otomatis</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dialog Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                    <button
                      type="button"
                      onClick={() => setIsResetPassModalOpen(false)}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1.5,
                        padding: '11px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(27, 67, 50, 0.25)',
                      }}
                    >
                      Setel Ulang Sekarang
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
