import { INITIAL_USERS, INITIAL_AUDIT_LOGS, simpleHash } from '../mocks/usersData';
import { delay, setAuthToken, request, USE_REAL_BACKEND } from './apiClient';

const STORAGE_USERS = 'farmsight_users_db_v1';
const STORAGE_LOGS = 'farmsight_audit_logs_v1';
const STORAGE_SESSION = 'farmsight_session_user';

function getLocalUsers() {
  const d = localStorage.getItem(STORAGE_USERS);
  if (!d) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  return JSON.parse(d);
}

function saveLocalUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getLocalLogs() {
  const d = localStorage.getItem(STORAGE_LOGS);
  if (!d) {
    localStorage.setItem(STORAGE_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  return JSON.parse(d);
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

    // Match by email, secondaryEmail, username prefix, or role keywords
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
      if (u.password === pass) return true;
      if (Array.isArray(u.altPasswords) && u.altPasswords.includes(pass)) return true;
      // Allow standard passwords for quick role login testing
      if (pass.length >= 4) {
        const p = pass.toLowerCase();
        if (p === 'admin' || p === 'admin123' || p === 'admin1234' || p === 'admin12345') return true;
        if (p === 'stock' || p === 'stock123' || p === 'stock1234' || p === 'stock12345') return true;
        if (p === 'sales' || p === 'sales123' || p === 'sales1234' || p === 'sales12345') return true;
        if (p === 'farm12345' || p === '12345678' || p === 'temppass2026' || p === 'farmtemp-2026') return true;
      }
      return false;
    };

    let user = users.find((u) => {
      const emailLower = (u.email || '').toLowerCase();
      const secLower = (u.secondaryEmail || '').toLowerCase();

      const emailMatch =
        emailLower === cleanInput ||
        secLower === cleanInput ||
        emailLower.startsWith(cleanInput + '@') ||
        (isSuperAdminKeyword && (u.role === 'SUPER_ADMIN' || u.role === ROLES.SUPER_ADMIN)) ||
        (isStockManagerKeyword && (u.role === 'STOCK_MANAGER' || u.role === ROLES.STOCK_MANAGER)) ||
        (isSalesAdminKeyword && (u.role === 'SALES_ADMIN' || u.role === ROLES.SALES_ADMIN)) ||
        (isStafBaruKeyword && (u.id === 'USR-004' || emailLower.includes('rian') || emailLower.includes('stafbaru')));

      if (!emailMatch) return false;
      return checkPasswordMatch(u, cleanPass);
    });

    // Fallback search in INITIAL_USERS if localStorage was stale
    if (!user) {
      user = INITIAL_USERS.find((u) => {
        const emailLower = (u.email || '').toLowerCase();
        const secLower = (u.secondaryEmail || '').toLowerCase();

        const emailMatch =
          emailLower === cleanInput ||
          secLower === cleanInput ||
          emailLower.startsWith(cleanInput + '@') ||
          (isSuperAdminKeyword && u.role === ROLES.SUPER_ADMIN) ||
          (isStockManagerKeyword && u.role === ROLES.STOCK_MANAGER) ||
          (isSalesAdminKeyword && u.role === ROLES.SALES_ADMIN) ||
          (isStafBaruKeyword && (u.id === 'USR-004' || emailLower.includes('rian') || emailLower.includes('stafbaru')));

        if (!emailMatch) return false;
        return checkPasswordMatch(u, cleanPass);
      });
      if (user) {
        users = INITIAL_USERS;
        saveLocalUsers(users);
      }
    }

    if (!user) {
      throw new Error('Alamat email atau kata sandi salah. Silakan periksa kembali kredensial Anda.');
    }

    if (!user.isActive) {
      throw new Error('Akun Anda telah dinonaktifkan oleh Super Admin. Hubungi pengelola untuk akses.');
    }

    // Update last login
    user.lastLogin = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB';
    saveLocalUsers(users);

    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(safeUser));
    setAuthToken('mock_jwt_token_' + user.id);

    // Record audit log
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
      return d ? JSON.parse(d) : null;
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
    user.must_change_password = false;
    saveLocalUsers(users);

    // Update current session
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

    // Generate temporary password
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
      must_change_password: true, // Wajib ganti saat login pertama!
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
    user.must_change_password = true; // Wajib ganti saat login berikutnya!
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

