import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { INITIAL_USERS } from '../mocks/usersData';
import { ROLES } from '../types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [idleNotice, setIdleNotice] = useState(false);
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('farmsight_users_db_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u) => (u.name === 'Bambang Sudarsono' ? { ...u, name: 'Ibu Intan Permatasari', roleTitle: 'Pemilik Toko (Super Admin)', avatar: 'IP' } : u));
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  });
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

    // Simulasikan batas sesi idle: 15 menit
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
    // Bersihkan sesi tab aktif agar saat baru login selalu menampilkan Dashboard Utama terlebih dahulu
    try {
      sessionStorage.removeItem('sales_admin_active_tab');
      sessionStorage.removeItem('super_admin_active_tab');
      sessionStorage.removeItem('stock_manager_active_tab');
    } catch {
      // ignore
    }
    // Hindari mengaktifkan global loading yang meng-unmount Login view
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
