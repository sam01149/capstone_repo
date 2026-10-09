import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ROLES,
  ROLE_DETAILS,
  getStoredUsers,
  saveStoredUsers,
  getStoredSession,
  saveStoredSession,
} from '../data/mockAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(getStoredUsers);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize app without auto-login so every visit starts fresh on public catalog
  useEffect(() => {
    // Clear any previous persistent session on fresh page loads
    saveStoredSession(null);
    setUser(null);
    setLoading(false);
  }, []);

  // Save users when state updates
  const updateUsersDb = (updatedList) => {
    setUsers(updatedList);
    saveStoredUsers(updatedList);
  };

  // FR-A-1: Login
  const login = async (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === trimmedEmail && u.password === password
    );

    if (!foundUser) {
      throw new Error('Email atau kata sandi tidak valid. Silakan periksa kembali kredensial Anda.');
    }

    if (foundUser.status !== 'Aktif') {
      throw new Error('Akun ini sedang dinonaktifkan. Silakan hubungi Super Admin Toko Farm Berkah.');
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

  // FR-A-3: Change Password
  const changePassword = async (oldPassword, newPassword) => {
    if (!user) throw new Error('Pengguna belum masuk');

    if (user.password !== oldPassword) {
      throw new Error('Kata sandi lama tidak sesuai.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Kata sandi baru minimal harus 8 karakter (NFR-SEC-1).');
    }

    const updatedUser = { ...user, password: newPassword };
    const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));

    updateUsersDb(updatedUsers);
    setUser(updatedUser);
    saveStoredSession(updatedUser);

    return true;
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

    const updatedUser = { ...found, password: newPassword };
    const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));

    updateUsersDb(updatedUsers);

    // If resetting active user
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

  // FR-A-5 & FR-A-6: Role Identification & Access Control
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

  // Super Admin User Management Functions (FR-UR-1 to FR-UR-7)
  const createUser = async (newUserData) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Hanya Super Admin yang memiliki hak akses untuk menambah pengguna.');
    }

    // Check duplicate email
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

    const newUser = {
      id: newId,
      name: newUserData.name,
      email: newUserData.email.trim().toLowerCase(),
      password: newUserData.password || 'farm12345',
      role: newUserData.role || ROLES.STOCK_MANAGER,
      roleTitle: newUserData.roleTitle || 'Staff Operasional',
      phone: newUserData.phone || '-',
      avatar: initials,
      status: 'Aktif',
      lastLogin: '-',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...users, newUser];
    updateUsersDb(updated);
    return newUser;
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

    // Prevent deactivating own account
    if (user && user.id === userId) {
      throw new Error('Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
    }

    const newStatus = target.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    updateUsersDb(updated);
  };

  const adminResetUserPassword = async (userId, newPassword) => {
    if (!isRole(ROLES.SUPER_ADMIN)) {
      throw new Error('Akses ditolak');
    }
    const updated = users.map((u) => (u.id === userId ? { ...u, password: newPassword } : u));
    updateUsersDb(updated);
  };

  const value = {
    user,
    role: user?.role || null,
    roleInfo: user?.role ? ROLE_DETAILS[user.role] : null,
    isAuthenticated: !!user,
    loading,
    users,
    login,
    quickLogin,
    logout,
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
