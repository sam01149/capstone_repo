import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ROLES,
  ROLE_DETAILS,
  DEFAULT_STAFF_PASSWORD,
  dummyHashPassword,
  getStoredUsers,
  saveStoredUsers,
  getStoredSession,
  saveStoredSession,
} from '../data/mockAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(getStoredUsers);
  const [user, setUser] = useState(() => getStoredSession());
  const [loading, setLoading] = useState(false);

  // Sync users in real-time across tabs or actions
  useEffect(() => {
    const handleSync = () => {
      setUsers(getStoredUsers());
      const sess = getStoredSession();
      if (sess) {
        const fresh = getStoredUsers().find((u) => u.id === sess.id);
        if (fresh) setUser(fresh);
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('farmsight_users_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('farmsight_users_updated', handleSync);
    };
  }, []);

  // Save users when state updates
  const updateUsersDb = (updatedList) => {
    setUsers(updatedList);
    saveStoredUsers(updatedList);
  };

  // FR-A-1: Login Staf
  const login = async (emailOrUsername, password) => {
    const trimmedInput = (emailOrUsername || '').trim().toLowerCase();
    const foundUser = users.find(
      (u) =>
        (u.email.toLowerCase() === trimmedInput || u.name.toLowerCase() === trimmedInput) &&
        u.password === password
    );

    if (!foundUser) {
      throw new Error('Alamat email/username atau kata sandi tidak valid. Akses ditolak.');
    }

    if (foundUser.status !== 'Aktif') {
      throw new Error('Akun ini dinonaktifkan. Silakan hubungi Super Admin Toko Farm Berkah.');
    }

    // Update last login
    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const updatedUser = { ...foundUser, lastLogin: nowStr };
    const updatedUsers = users.map((u) => (u.id === foundUser.id ? updatedUser : u));

    updateUsersDb(updatedUsers);
    setUser(updatedUser);
    saveStoredSession(updatedUser);

    return updatedUser;
  };

  // Quick switch / demo login helper
  const quickLogin = async (targetRole) => {
    const target = users.find((u) => u.role === targetRole);
    if (target) {
      return login(target.email, target.password);
    }
    throw new Error(`Akun untuk role ${targetRole} tidak ditemukan`);
  };

  // FR-A-2: Logout
  const logout = () => {
    setUser(null);
    saveStoredSession(null);
  };

  // Alur Wajib Ganti Password (must_change_password = true -> input pw baru -> simpan hash & set must_change_password = false)
  const completeForceChangePassword = async (newPassword) => {
    if (!user) throw new Error('Pengguna belum masuk.');

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Kata sandi baru minimal harus 8 karakter untuk keamanan.');
    }

    const newHash = dummyHashPassword(newPassword);
    const updatedUser = {
      ...user,
      password: newPassword,
      passwordHash: newHash,
      must_change_password: false,
    };

    const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));

    updateUsersDb(updatedUsers);
    setUser(updatedUser);
    saveStoredSession(updatedUser);

    return updatedUser;
  };

  // FR-A-3: Change Password Reguler
  const changePassword = async (oldPassword, newPassword) => {
    if (!user) throw new Error('Pengguna belum masuk');

    if (user.password !== oldPassword) {
      throw new Error('Kata sandi lama tidak sesuai.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Kata sandi baru minimal harus 8 karakter (NFR-SEC-1).');
    }

    return completeForceChangePassword(newPassword);
  };

  // FR-A-4: Forgot / Reset Password flow
  const resetPasswordByEmail = async (email, newPassword) => {
    const trimmedEmail = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!found) {
      throw new Error('Email tidak terdaftar dalam sistem Toko Farm Berkah.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Kata sandi baru minimal harus 8 karakter.');
    }

    const updatedUser = {
      ...found,
      password: newPassword,
      passwordHash: dummyHashPassword(newPassword),
      must_change_password: false,
    };
    const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));

    updateUsersDb(updatedUsers);

    if (user && user.id === found.id) {
      setUser(updatedUser);
      saveStoredSession(updatedUser);
    }

    return true;
  };

  // Profile update
  const updateProfile = async (formData) => {
    if (!user) return;
    const updatedUser = { ...user, ...formData };
    const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
    updateUsersDb(updatedUsers);
    setUser(updatedUser);
    saveStoredSession(updatedUser);
  };

  // Role Identification & Access Control
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    const roleConfig = ROLE_DETAILS[user.role];
    if (!roleConfig) return false;
    return roleConfig.permissions.includes(permission);
  };

  const isRole = (...allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  // Super Admin: Aksi 1 - Input Data Akun Baru & Role
  // Sistem buat pw sementara, simpan hash, perbarui database dengan must_change_password = true
  const createUser = async (newUserData) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Hanya Super Admin yang memiliki hak akses untuk menambah pengguna.');
    }

    if (users.some((u) => u.email.toLowerCase() === newUserData.email.toLowerCase().trim())) {
      throw new Error('Email sudah terdaftar. Gunakan alamat email lain.');
    }

    const newId = `usr-${String(users.length + 1).padStart(3, '0')}`;
    const initials = newUserData.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    // Buat kata sandi sementara otomatis jika tidak diisi manual
    const tempPassword = newUserData.password?.trim() || `farmTemp-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempHash = dummyHashPassword(tempPassword);

    const newUser = {
      id: newId,
      name: newUserData.name.trim(),
      email: newUserData.email.trim().toLowerCase(),
      password: tempPassword,
      passwordHash: tempHash,
      role: newUserData.role || ROLES.SALES_ADMIN,
      roleTitle: newUserData.roleTitle || (newUserData.role === ROLES.STOCK_MANAGER ? 'Staff Gudang & Stok' : 'Staff Operasional Penjualan'),
      phone: newUserData.phone || '-',
      avatar: initials,
      status: 'Aktif',
      must_change_password: true, // Wajib ganti saat login pertama kali
      lastLogin: '-',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...users, newUser];
    updateUsersDb(updated);
    return { newUser, tempPassword };
  };

  const updateUser = async (userId, data) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Akses ditolak: Hanya Super Admin yang dapat mengubah data pengguna.');
    }

    const updated = users.map((u) => (u.id === userId ? { ...u, ...data } : u));
    updateUsersDb(updated);

    if (user && user.id === userId) {
      const activeUpdated = { ...user, ...data };
      setUser(activeUpdated);
      saveStoredSession(activeUpdated);
    }
  };

  const toggleUserStatus = async (userId) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Akses ditolak');
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    if (user && user.id === userId) {
      throw new Error('Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
    }

    const newStatus = target.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    updateUsersDb(updated);
  };

  // Super Admin: Aksi 2 - Reset Password pada Akun Staff
  // Sistem buat pw sementara, simpan hash, perbarui database dengan must_change_password = true
  const adminResetUserPassword = async (userId, customTempPassword) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Akses ditolak: Hanya Super Admin yang memiliki wewenang mereset kata sandi staf.');
    }

    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('Pengguna tidak ditemukan.');

    const tempPassword = customTempPassword && customTempPassword.trim()
      ? customTempPassword.trim()
      : `farmReset-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempHash = dummyHashPassword(tempPassword);

    const updatedUser = {
      ...target,
      password: tempPassword,
      passwordHash: tempHash,
      must_change_password: true, // Wajib ganti password pada login berikutnya
    };

    const updated = users.map((u) => (u.id === userId ? updatedUser : u));
    updateUsersDb(updated);

    return { updatedUser, tempPassword };
  };

  const value = {
    user,
    role: user?.role || null,
    roleInfo: user?.role ? ROLE_DETAILS[user.role] : null,
    isAuthenticated: !!user,
    loading,
    users,
    defaultPassword: DEFAULT_STAFF_PASSWORD,
    login,
    quickLogin,
    logout,
    completeForceChangePassword,
    changePassword,
    resetPasswordByEmail,
    updateProfile,
    hasPermission,
    isRole,
    createUser,
    updateUser,
    toggleUserStatus,
    adminResetUserPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
