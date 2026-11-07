import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Phone,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES, dummyHashPassword } from '../data/mockAuth';

export default function ManajemenAkun({
  showToast,
  isAddUserModalOpen: externalIsAddUserOpen,
  setIsAddUserModalOpen: setExternalIsAddUserOpen,
}) {
  const {
    users = [],
    createUser,
    toggleUserStatus,
    adminResetUserPassword,
  } = useAuth();

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Modal Tambah Akun
  const [internalIsAddUserOpen, setInternalIsAddUserOpen] = useState(false);
  const isAddUserModalOpen = externalIsAddUserOpen !== undefined ? externalIsAddUserOpen : internalIsAddUserOpen;
  const setIsAddUserModalOpen = setExternalIsAddUserOpen || setInternalIsAddUserOpen;

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState(ROLES.SALES_ADMIN);
  const [newUserRoleTitle, setNewRoleTitle] = useState('Staff Operasional Penjualan');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Modal Reset Password
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);

  // Modal Hasil Sukses Aksi Akun
  const [userActionSuccessModal, setUserActionSuccessModal] = useState(null);
  const [isCopiedPass, setIsCopiedPass] = useState(false);

  // Helper Salin Kata Sandi ke Clipboard
  const handleCopyPassword = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopiedPass(true);
    setTimeout(() => setIsCopiedPass(false), 2500);
    if (showToast) {
      showToast('Kata sandi sementara disalin ke clipboard!');
    }
  };

  // Helper Link WhatsApp
  const generateSharePasswordWhatsAppUrl = (account, tempPassword) => {
    const cleanPhone = (account?.phone || '').replace(/[^0-9]/g, '');
    const phoneTarget = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const message = [
      `Halo kak ${account?.name || 'Staf'},`,
      `Berikut adalah informasi akun resmi Anda di sistem Toko Farm Berkah:`,
      ``,
      `• Email / Username: ${account?.email}`,
      `• Peran (Role): ${account?.roleTitle || account?.role}`,
      `• Kata Sandi Sementara: ${tempPassword}`,
      ``,
      `⚠️ PEMBERITAHUAN KEAMANAN: Kata sandi di atas dibuat sementara oleh Super Admin. Anda diwajibkan membuat kata sandi baru saat pertama kali login.`,
      ``,
      `Terima kasih! 🙏`,
      `Salam hangat,`,
      `Super Admin Toko Farm Berkah`,
    ].join('\n');
    return `https://api.whatsapp.com/send?phone=${phoneTarget}&text=${encodeURIComponent(message)}`;
  };

  // Submit Buat Akun Baru
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      if (showToast) showToast('Nama lengkap dan email staf wajib diisi.');
      return;
    }

    try {
      const result = await createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        roleTitle: newUserRoleTitle,
        phone: newUserPhone.trim(),
      });

      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');

      setUserActionSuccessModal({
        actionType: 'CREATE_USER',
        title: 'Akun Staf Baru Berhasil Didaftarkan!',
        account: result.newUser,
        tempPassword: result.tempPassword,
        hash: result.newUser.passwordHash || dummyHashPassword(result.tempPassword),
        note: 'Sistem telah berhasil membuat kata sandi sementara. Staf diwajibkan mengganti kata sandi dengan kata sandi baru saat pertama kali login.',
      });
      if (showToast) showToast(`Akun staf ${newUserName} berhasil dibuat. Database diperbarui!`);
    } catch (err) {
      if (showToast) showToast(err.message || 'Gagal membuat akun staf baru.');
    }
  };

  // Konfirmasi Reset Password
  const handleResetPasswordConfirm = async () => {
    if (!selectedUserForReset) return;
    try {
      const result = await adminResetUserPassword(selectedUserForReset.id);
      setIsResetPassModalOpen(false);

      setUserActionSuccessModal({
        actionType: 'RESET_PASSWORD',
        title: 'Kata Sandi Staf Berhasil Direset!',
        account: result.updatedUser || selectedUserForReset,
        tempPassword: result.tempPassword,
        hash: result.updatedUser?.passwordHash || dummyHashPassword(result.tempPassword),
        note: 'Sistem telah berhasil mengatur ulang kata sandi sementara baru. Staf wajib mengganti kata sandi saat pertama kali login.',
      });
      if (showToast) showToast(`Kata sandi untuk ${selectedUserForReset.name} berhasil diatur ulang. Database diperbarui!`);
    } catch (err) {
      if (showToast) showToast(err.message || 'Gagal mereset kata sandi staf.');
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];

  const filteredUsers = safeUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const roleTitle = (u.roleTitle || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || roleTitle.includes(q);
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Manajemen Akun */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e1e7e2',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
            Manajemen Akun Pengguna & Peran (Role)
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Pilih aksi: <strong>Input Data Akun Baru & Role</strong> atau klik <strong>Reset Password</strong> pada akun staf. Sistem akan otomatis membuat kata sandi sementara untuk staf.
          </p>
        </div>

        {/* Tombol Input Data Akun Baru & Role */}
        <button
          type="button"
          onClick={() => setIsAddUserModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: '#1b4332',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(27, 67, 50, 0.25)',
          }}
        >
          <UserPlus size={16} />
          <span>Input Data Akun Baru & Role</span>
        </button>
      </div>

      {/* Filter & Toolbar Pencarian Akun */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e1e7e2',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari nama, email, atau kontak staf..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 12px 0 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
            style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="ALL">Semua Role</option>
            <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
            <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
            <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
          </select>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Menampilkan <strong>{filteredUsers.length}</strong> akun staf
        </div>
      </div>

      {/* Tabel Daftar Akun Staf */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '12px 14px', width: '20%' }}>Pengguna / Nama Staf</th>
                <th style={{ padding: '12px 14px', width: '21%' }}>Email & WhatsApp</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '14%' }}>Peran (Role)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '18%' }}>Status Keamanan Sandi</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '12%' }}>Status Akun</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '15%' }}>Aksi (Reset Password)</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSuper = u.role === ROLES.SUPER_ADMIN;
                const roleBadgeBg = u.role === ROLES.SUPER_ADMIN ? '#d8f3dc' : u.role === ROLES.STOCK_MANAGER ? '#dbeafe' : '#fef3c7';
                const roleBadgeColor = u.role === ROLES.SUPER_ADMIN ? '#1b4332' : u.role === ROLES.STOCK_MANAGER ? '#1e40af' : '#b45309';

                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafcfb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: roleBadgeBg, color: roleBadgeColor, fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {u.avatar || u.name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                          {u.name}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={11} color="#94a3b8" />
                        <span>{u.phone || '-'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          backgroundColor: roleBadgeBg,
                          color: roleBadgeColor,
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.role === ROLES.SUPER_ADMIN ? 'Super Admin' : u.role === ROLES.STOCK_MANAGER ? 'Stock Manager' : 'Sales Admin'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {u.must_change_password ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                          title="Akun ini wajib membuat kata sandi baru saat login berikutnya"
                        >
                          <Lock size={11} />
                          <span>Sandi Sementara Aktif</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle2 size={11} />
                          <span>Terenkripsi Aman</span>
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(u.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          border: (u.isActive !== false) ? '1px solid #86efac' : '1px solid #fecaca',
                          backgroundColor: (u.isActive !== false) ? '#dcfce7' : '#fee2e2',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: isSuper ? 'not-allowed' : 'pointer',
                          color: (u.isActive !== false) ? '#15803d' : '#dc2626',
                        }}
                        title={isSuper ? 'Akun pemilik selalu aktif' : 'Klik untuk mengubah status aktif/nonaktif akun'}
                        disabled={isSuper}
                      >
                        {(u.isActive !== false) ? '✓ Aktif' : '✕ Nonaktif'}
                      </button>
                    </td>

                    {/* Tombol Reset Password */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserForReset(u);
                          setIsResetPassModalOpen(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '5px',
                          border: '1px solid #f59e0b',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                        title="Klik untuk mereset kata sandi staf dengan password sementara otomatis"
                      >
                        <KeyRound size={11} />
                        <span>Reset Password</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: INPUT DATA AKUN BARU & ROLE */}
      {isAddUserModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleCreateUserSubmit}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e1e7e2',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#1b4332" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Input Data Akun Baru & Role
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Lengkap Staf *</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Contoh: Rian Pratama"
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Alamat Email Staf *</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="rian@farmberkah.com"
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Peran (Role) *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => {
                    setNewUserRole(e.target.value);
                    setNewRoleTitle(
                      e.target.value === ROLES.SALES_ADMIN
                        ? 'Staff Operasional Penjualan'
                        : e.target.value === ROLES.STOCK_MANAGER
                          ? 'Staff Gudang & Inventaris'
                          : 'Super Admin'
                    );
                  }}
                  style={{ width: '100%', height: '38px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
                  <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
                  <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nomor WhatsApp</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Keterangan Keamanan Password Sementara */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', fontSize: '0.76rem', color: '#166534' }}>
              <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} />
                <span>Petunjuk Keamanan Sistem:</span>
              </div>
              <div style={{ textAlign: 'justify', lineHeight: 1.5 }}>
                Sistem akan membuat <strong>Kata Sandi Sementara</strong> yang aman. Staf akan diminta membuat kata sandi baru saat pertama kali masuk ke sistem.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(27,67,50,0.25)' }}
              >
                Simpan Akun & Buat Sandi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI RESET PASSWORD AKUN STAFF */}
      {isResetPassModalOpen && selectedUserForReset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e1e7e2',
              width: '100%',
              maxWidth: '430px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="#b45309" />
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Reset Password Akun Staff
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPassModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.45 }}>
              Anda akan mengatur ulang kata sandi untuk akun staf:
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedUserForReset.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{selectedUserForReset.email}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', fontSize: '0.76rem', color: '#92400e', textAlign: 'justify', lineHeight: 1.5 }}>
              <strong>Petunjuk Keamanan Sistem:</strong> Sistem akan membuat <strong>Kata Sandi Sementara</strong> baru. Staf dapat menggunakannya untuk masuk dan langsung diarahkan membuat kata sandi pribadi.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsResetPassModalOpen(false)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPasswordConfirm}
                style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#b45309', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)' }}
              >
                Konfirmasi Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: HASIL SUKSES & PASSWORD SEMENTARA */}
      {userActionSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #86efac',
              width: '100%',
              maxWidth: '480px',
              padding: '26px',
              boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px auto' }}>
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#142019', textAlign: 'center', margin: 0 }}>
              {userActionSuccessModal.title}
            </h3>

            <p style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', margin: 0, lineHeight: 1.45 }}>
              {userActionSuccessModal.note}
            </p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2ee', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Nama Staf:</span>
                <strong>{userActionSuccessModal.account.name}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2ee', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Email / Username:</span>
                <strong>{userActionSuccessModal.account.email}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2ee', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Peran (Role):</span>
                <strong style={{ color: '#1b4332' }}>{userActionSuccessModal.account.role}</strong>
              </div>

              {/* KOTAK KATA SANDI SEMENTARA */}
              <div style={{ marginTop: '4px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1.5px solid #fde68a' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Kata Sandi Sementara Dibuat Sistem:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', color: '#b45309', letterSpacing: '0.05em' }}>
                    {userActionSuccessModal.tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(userActionSuccessModal.tempPassword)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      backgroundColor: '#ffffff',
                      color: '#b45309',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCopiedPass ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{isCopiedPass ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* INFORMASI KEAMANAN AKUN */}
              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '9px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>Data akun telah disimpan dengan aman. Staf akan diminta membuat kata sandi baru saat pertama kali masuk.</span>
              </div>
            </div>

            {/* Tombol Aksi Bagi Staf */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <a
                href={generateSharePasswordWhatsAppUrl(userActionSuccessModal.account, userActionSuccessModal.tempPassword)}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                title="Kirim informasi sandi sementara langsung ke WhatsApp staf"
              >
                <MessageSquare size={14} />
                <span>Kirim ke WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setUserActionSuccessModal(null)}
                style={{
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

