import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_USERS, INITIAL_AUDIT_LOGS, simpleHash } from '../data/usersData';
import { ROLES } from '../data/types';

// ============================================================================
// API & STORAGE CLIENT CONFIGURATION
// ============================================================================
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export const USE_REAL_BACKEND = false; // Toggle to true when backend API is connected
export const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export function getAuthToken() {
  return localStorage.getItem('farmsight_jwt_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('farmsight_jwt_token', token);
  } else {
    localStorage.removeItem('farmsight_jwt_token');
  }
}

export async function request(endpoint, options = {}) {
  if (USE_REAL_BACKEND) {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }
  await delay();
  return null;
}

// ============================================================================
// AUTENTIKASI & MANAJEMEN AKUN LOGIC
// ============================================================================
const STORAGE_USERS = 'farmsight_users_db_v1';
const STORAGE_LOGS = 'farmsight_audit_logs_v1';
const STORAGE_SESSION = 'farmsight_session_user';

function getLocalUsers() {
  const d = localStorage.getItem(STORAGE_USERS);
  let users;
  if (!d) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    users = JSON.parse(d);
  } catch {
    users = INITIAL_USERS;
  }

  let modified = false;
  users = users.map((u) => {
    if (u.name === 'Bambang Sudarsono') {
      modified = true;
      u = { ...u, name: 'Ibu Intan Permatasari', roleTitle: 'Pemilik Toko (Super Admin)', avatar: 'IP' };
    }
    // Update nomor telepon Ibu Intan (Super Admin) ke format konsisten +62 813-1000-3455
    if (
      u.id === 'USR-001' ||
      u.id === 'USR-001B' ||
      u.email === 'admin@farmberkah.com' ||
      u.email === 'superadmin@farmberkah.com' ||
      u.name?.toLowerCase().includes('intan') ||
      (u.phone && (u.phone.includes('3456-7890') || u.phone.includes('34567890') || u.phone.includes('10003455') || u.phone.includes('1000-3455')))
    ) {
      if (u.phone !== '+62 813-1000-3455') {
        modified = true;
        u = { ...u, phone: '+62 813-1000-3455' };
      }
    }
    return u;
  });

  if (modified) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }
  return users;
}

function saveLocalUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getLocalLogs() {
  const d = localStorage.getItem(STORAGE_LOGS);
  let logs;
  if (!d) {
    localStorage.setItem(STORAGE_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  try {
    logs = JSON.parse(d);
  } catch {
    logs = INITIAL_AUDIT_LOGS;
  }

  let modified = false;
  logs = logs.map((l) => {
    if (l.user && l.user.includes('Bambang Sudarsono')) {
      modified = true;
      return { ...l, user: l.user.replace('Bambang Sudarsono', 'Ibu Intan Permatasari') };
    }
    return l;
  });

  if (modified) {
    localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
  }
  return logs;
}

function saveLocalLogs(logs) {
  localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
}

export const authService = {
  async login(email, password) {
    if (USE_REAL_BACKEND) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.accessToken);
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(res.user));
      return res.user;
    }

    await delay(150);
    let users = getLocalUsers();
    if (!Array.isArray(users) || users.length === 0) {
      users = INITIAL_USERS;
      saveLocalUsers(users);
    }

    const cleanInput = (email || '').toLowerCase().trim();
    const cleanPass = String(password || '').trim();

    const isSuperAdminKeyword =
      cleanInput === 'admin' ||
      cleanInput === 'superadmin' ||
      cleanInput === 'super admin' ||
      cleanInput === 'super_admin' ||
      cleanInput.includes('super');

    const isStockManagerKeyword =
      cleanInput === 'stock' ||
      cleanInput === 'stockmanager' ||
      cleanInput === 'stock manager' ||
      cleanInput === 'stock_manager' ||
      cleanInput.includes('gudang');

    const isSalesAdminKeyword =
      cleanInput === 'sales' ||
      cleanInput === 'salesadmin' ||
      cleanInput === 'sales admin' ||
      cleanInput === 'sales_admin' ||
      cleanInput.includes('penjualan');

    const isStafBaruKeyword =
      cleanInput === 'rian' ||
      cleanInput === 'stafbaru' ||
      cleanInput === 'staf baru' ||
      cleanInput.includes('baru');

    const checkPasswordMatch = (u, pass) => {
      if (!pass) return false;
      const cleanP = String(pass).trim();
      const pLower = cleanP.toLowerCase();

      if (u.password === cleanP || u.password === pass) return true;
      if (u.password && String(u.password).trim().toLowerCase() === pLower) return true;
      if (Array.isArray(u.altPasswords) && u.altPasswords.includes(cleanP)) return true;

      const uRole = String(u.role || '').toUpperCase();
      if (uRole.includes('SUPER') || u.id === 'USR-001' || u.id === 'USR-001B') {
        if (pLower === 'admin1234' || pLower === 'admin123' || pLower === 'admin' || pLower === 'admin12345' || pLower === 'adminfarm2026!') {
          return true;
        }
      }

      if (uRole.includes('STOCK') || u.id === 'USR-002' || u.id === 'USR-002B') {
        if (pLower === 'stock1234' || pLower === 'stock123' || pLower === 'stock' || pLower === 'stock12345' || pLower === 'stockmanager2026!') {
          return true;
        }
      }

      if (uRole.includes('SALES') || u.id === 'USR-003' || u.id === 'USR-003B') {
        if (pLower === 'sales1234' || pLower === 'sales123' || pLower === 'sales' || pLower === 'sales12345' || pLower === 'salesadmin2026!') {
          return true;
        }
      }

      if (u.id === 'USR-004' || u.id === 'USR-004B' || (u.email && u.email.includes('stafbaru'))) {
        if (pLower === 'temppass2026' || pLower === 'temppass123!') {
          return true;
        }
      }

      return false;
    };

    let user = users.find((u) => {
      const emailLower = (u.email || '').toLowerCase();
      const secLower = (u.secondaryEmail || '').toLowerCase();

      return (
        emailLower === cleanInput ||
        secLower === cleanInput ||
        emailLower.startsWith(cleanInput + '@') ||
        (isSuperAdminKeyword && (u.role === 'SUPER_ADMIN' || u.role === ROLES.SUPER_ADMIN)) ||
        (isStockManagerKeyword && (u.role === 'STOCK_MANAGER' || u.role === ROLES.STOCK_MANAGER)) ||
        (isSalesAdminKeyword && (u.role === 'SALES_ADMIN' || u.role === ROLES.SALES_ADMIN)) ||
        (isStafBaruKeyword && (u.id === 'USR-004' || emailLower.includes('rian') || emailLower.includes('stafbaru')))
      );
    });

    if (!user) {
      user = INITIAL_USERS.find((u) => {
        const emailLower = (u.email || '').toLowerCase();
        const secLower = (u.secondaryEmail || '').toLowerCase();

        return (
          emailLower === cleanInput ||
          secLower === cleanInput ||
          emailLower.startsWith(cleanInput + '@') ||
          (isSuperAdminKeyword && u.role === ROLES.SUPER_ADMIN) ||
          (isStockManagerKeyword && u.role === ROLES.STOCK_MANAGER) ||
          (isSalesAdminKeyword && u.role === ROLES.SALES_ADMIN) ||
          (isStafBaruKeyword && (u.id === 'USR-004' || emailLower.includes('rian') || emailLower.includes('stafbaru')))
        );
      });
      if (user) {
        users = [...users, user];
        saveLocalUsers(users);
      }
    }

    if (!user) {
      throw new Error('Alamat email atau kata sandi salah. Silakan periksa kembali kredensial Anda.');
    }

    const isSuper = (user.role === 'SUPER_ADMIN' || user.role === ROLES.SUPER_ADMIN || user.id === 'USR-001' || user.id === 'USR-001B');
    if (isSuper) {
      user.isActive = true;
    }

    if (!isSuper && (user.isActive === false || user.status === 'Nonaktif')) {
      throw new Error('Akun staf Anda berstatus Nonaktif oleh Super Admin. Tidak dapat digunakan untuk login.');
    }

    const isMatch = checkPasswordMatch(user, cleanPass);
    if (!isMatch) {
      throw new Error('Alamat email atau kata sandi salah. Silakan periksa kembali kredensial Anda.');
    }

    user.lastLogin = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB';
    saveLocalUsers(users);

    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(safeUser));
    setAuthToken('mock_jwt_token_' + user.id);

    this.recordAuditLog(user.name, 'LOGIN_SUCCESS', 'Autentikasi', `Berhasil login ke role ${user.role}`);

    return safeUser;
  },

  async logout() {
    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog(current.name, 'LOGOUT', 'Autentikasi', 'Keluar dari sistem FarmSight');
    }
    localStorage.removeItem(STORAGE_SESSION);
    setAuthToken(null);
    await delay(100);
    return true;
  },

  getCurrentUser() {
    try {
      const d = localStorage.getItem(STORAGE_SESSION);
      if (!d) return null;
      const u = JSON.parse(d);
      if (u && (u.name === 'Bambang Sudarsono' || (!u.name && u.role === ROLES.SUPER_ADMIN))) {
        u.name = 'Ibu Intan Permatasari';
        u.avatar = 'IP';
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(u));
      }
      if (
        u &&
        (u.id === 'USR-001' ||
          u.id === 'USR-001B' ||
          u.email === 'admin@farmberkah.com' ||
          u.email === 'superadmin@farmberkah.com' ||
          u.name?.toLowerCase().includes('intan') ||
          (u.phone && (u.phone.includes('3456-7890') || u.phone.includes('34567890') || u.phone.includes('10003455') || u.phone.includes('1000-3455'))))
      ) {
        if (u.phone !== '+62 813-1000-3455') {
          u.phone = '+62 813-1000-3455';
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(u));
        }
      }
      return u;
    } catch {
      return null;
    }
  },

  async changePassword(userId, newPassword) {
    if (USE_REAL_BACKEND) {
      return request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ userId, newPassword }),
      });
    }

    await delay(250);
    const users = getLocalUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');

    user.password = newPassword;
    user.passwordHash = simpleHash(newPassword);
    user.altPasswords = [];
    user.must_change_password = false;
    user.hasChangedPassword = true;
    saveLocalUsers(users);

    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      current.must_change_password = false;
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(current));
    }

    this.recordAuditLog(user.name, 'CHANGE_PASSWORD', 'Keamanan Akun', 'Membuat kata sandi baru dan menonaktifkan must_change_password');
    return user;
  },

  async getUsers() {
    if (USE_REAL_BACKEND) return request('/users');
    await delay(200);
    return getLocalUsers();
  },

  async createUser({ name, email, role, roleTitle, phone }) {
    if (USE_REAL_BACKEND) {
      return request('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, role, roleTitle, phone }),
      });
    }

    await delay(350);
    const users = getLocalUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) throw new Error('Email staf sudah terdaftar.');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let tempPass = 'FB-';
    for (let i = 0; i < 6; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newUser = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: tempPass,
      passwordHash: simpleHash(tempPass),
      role,
      roleTitle: roleTitle || 'Staf Operasional',
      phone: phone || '-',
      isActive: true,
      status: 'Aktif',
      must_change_password: true,
      lastLogin: 'Belum pernah login',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const updated = [newUser, ...users];
    saveLocalUsers(updated);

    this.recordAuditLog('Super Admin', 'CREATE_USER', 'Manajemen Akun', `Membuat akun staf baru: ${name} (${role}), must_change_password=true`);

    return { newUser, tempPassword: tempPass };
  },

  async resetPassword(userId) {
    if (USE_REAL_BACKEND) {
      return request(`/users/${userId}/reset-password`, { method: 'POST' });
    }

    await delay(300);
    const users = getLocalUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('Staf tidak ditemukan.');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let tempPass = 'RST-';
    for (let i = 0; i < 6; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user.password = tempPass;
    user.passwordHash = simpleHash(tempPass);
    user.must_change_password = true;
    saveLocalUsers(users);

    this.recordAuditLog('Super Admin', 'RESET_PASSWORD', 'Manajemen Akun', `Reset kata sandi staf: ${user.name}. must_change_password=true diset.`);

    return { user, tempPassword: tempPass };
  },

  async toggleUserStatus(userId) {
    if (USE_REAL_BACKEND) {
      return request(`/users/${userId}/toggle-status`, { method: 'PATCH' });
    }

    await delay(200);
    const users = getLocalUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('Staf tidak ditemukan.');

    user.isActive = !user.isActive;
    user.status = user.isActive ? 'Aktif' : 'Nonaktif';
    saveLocalUsers(users);

    this.recordAuditLog('Super Admin', 'TOGGLE_STATUS', 'Manajemen Akun', `Mengubah status akun ${user.name} menjadi ${user.isActive ? 'Aktif' : 'Nonaktif'}`);
    return user;
  },

  async updateUser(userId, data) {
    if (USE_REAL_BACKEND) {
      return request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    await delay(250);
    const users = getLocalUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('Staf tidak ditemukan.');

    users[idx] = { ...users[idx], ...data };
    saveLocalUsers(users);

    this.recordAuditLog('Super Admin', 'UPDATE_USER', 'Manajemen Akun', `Memperbarui data staf ${users[idx].name}`);
    return users[idx];
  },

  async getAuditLogs() {
    if (USE_REAL_BACKEND) return request('/audit-logs');
    await delay(150);
    return getLocalLogs();
  },

  recordAuditLog(user, action, module, details) {
    const logs = getLocalLogs();
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      user,
      action,
      module,
      details,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }),
    };
    saveLocalLogs([newLog, ...logs]);
  },
};

// ============================================================================
// REACT CONTEXT & HOOK PROVIDER
// ============================================================================
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [idleNotice, setIdleNotice] = useState(false);
  const [users, setUsers] = useState(() => getLocalUsers());
  const idleTimeoutRef = useRef(null);

  const syncUsers = useCallback(async () => {
    try {
      const u = await authService.getUsers();
      if (Array.isArray(u) && u.length > 0) {
        setUsers(u);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    syncUsers();
    const handleStorage = () => syncUsers();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('farmsight_users_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('farmsight_users_updated', handleStorage);
    };
  }, [syncUsers]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (!user) return;

    idleTimeoutRef.current = setTimeout(() => {
      authService.logout();
      setUser(null);
      setIdleNotice(true);
    }, 15 * 60 * 1000);
  }, [user]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const handleUserActivity = () => resetIdleTimer();

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity));
    resetIdleTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [resetIdleTimer]);

  const login = async (email, password) => {
    try {
      sessionStorage.removeItem('sales_admin_active_tab');
      sessionStorage.removeItem('super_admin_active_tab');
      sessionStorage.removeItem('stock_manager_active_tab');
    } catch {
      // ignore
    }
    const loggedUser = await authService.login(email, password);
    setUser(loggedUser);
    setIdleNotice(false);
    return loggedUser;
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem('sales_admin_active_tab');
      sessionStorage.removeItem('super_admin_active_tab');
      sessionStorage.removeItem('stock_manager_active_tab');
    } catch {
      // ignore
    }
    await authService.logout();
    setUser(null);
  };

  const completeForceChangePassword = async (newPassword) => {
    if (!user) return;
    const updated = await authService.changePassword(user.id, newPassword);
    setUser({ ...user, must_change_password: false });
    await syncUsers();
    return updated;
  };

  const createUser = async (userData) => {
    const res = await authService.createUser(userData);
    await syncUsers();
    return res;
  };

  const updateUser = async (userId, data) => {
    const res = await authService.updateUser(userId, data);
    await syncUsers();
    return res;
  };

  const toggleUserStatus = async (userId) => {
    const res = await authService.toggleUserStatus(userId);
    await syncUsers();
    return res;
  };

  const adminResetUserPassword = async (userId, customPassword) => {
    let res;
    if (customPassword && customPassword.trim()) {
      res = await authService.changePassword(userId, customPassword.trim());
      await authService.updateUser(userId, { must_change_password: true });
      const currentList = await authService.getUsers();
      const updatedUser = currentList.find((u) => u.id === userId) || res;
      await syncUsers();
      return {
        updatedUser,
        user: updatedUser,
        tempPassword: customPassword.trim(),
      };
    } else {
      res = await authService.resetPassword(userId);
      await syncUsers();
      return {
        updatedUser: res.user,
        user: res.user,
        tempPassword: res.tempPassword,
      };
    }
  };

  const value = {
    user,
    role: user?.role || ROLES.GUEST,
    isAuthenticated: !!user,
    loading,
    idleNotice,
    dismissIdleNotice: () => setIdleNotice(false),
    login,
    logout,
    completeForceChangePassword,
    users,
    createUser,
    updateUser,
    toggleUserStatus,
    adminResetUserPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      role: null,
      isAuthenticated: false,
      loading: false,
      idleNotice: false,
      dismissIdleNotice: () => {},
      login: async () => {},
      logout: async () => {},
      completeForceChangePassword: async () => {},
      users: [],
      createUser: async () => ({}),
      updateUser: async () => ({}),
      toggleUserStatus: async () => ({}),
      adminResetUserPassword: async () => ({}),
    };
  }
  return ctx;
}
