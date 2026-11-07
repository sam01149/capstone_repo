import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_NOTIFICATIONS } from '../data/ordersAndInventoryData';
import { useAuth } from '../auth/AuthContext';

// ============================================================================
// NOTIFICATION ENGINE & PERSISTENCE
// ============================================================================
const STORAGE_NOTIFS = 'farmsight_notifications_db_v1';

function getLocalNotifs() {
  const d = localStorage.getItem(STORAGE_NOTIFS);
  if (!d) {
    localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
  return JSON.parse(d);
}

function saveLocalNotifs(notifs) {
  localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifs));
  window.dispatchEvent(new Event('farmsight_notifs_updated'));
}

export const notificationService = {
  async getNotifications(role = 'ALL') {
    const list = getLocalNotifs();
    if (role === 'ALL' || role === 'SUPER_ADMIN') return list;
    return list.filter((n) => n.roleTarget === role || n.roleTarget === 'ALL');
  },

  async markAsRead(id) {
    const list = getLocalNotifs();
    const notif = list.find((n) => n.id === id);
    if (notif) notif.isRead = true;
    saveLocalNotifs(list);
    return true;
  },

  async markAllAsRead(role = 'ALL') {
    const list = getLocalNotifs();
    for (const n of list) {
      if (role === 'ALL' || n.roleTarget === role) n.isRead = true;
    }
    saveLocalNotifs(list);
    return true;
  },

  sendNotification({ roleTarget, title, message, type = 'INFO', link }) {
    const list = getLocalNotifs();
    const newNotif = {
      id: `NOTIF-${Date.now().toString().slice(-6)}`,
      roleTarget: roleTarget || 'ALL',
      title,
      message,
      type,
      isRead: false,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      link: link || '#',
    };
    saveLocalNotifs([newNotif, ...list]);
    return newNotif;
  },
};

export const sendNotification = notificationService.sendNotification;

// ============================================================================
// NOTIFICATION CONTEXT & HOOK
// ============================================================================
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    try {
      const list = await notificationService.getNotifications(role);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.warn('Failed to fetch notifications', err);
    }
  }, [role]);

  useEffect(() => {
    fetchNotifs();
    const handleUpdate = () => fetchNotifs();
    window.addEventListener('farmsight_notifs_updated', handleUpdate);
    const interval = setInterval(fetchNotifs, 10000); // Polling every 10s
    return () => {
      window.removeEventListener('farmsight_notifs_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  const markAsRead = async (id) => {
    await notificationService.markAsRead(id);
    fetchNotifs();
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead(role);
    fetchNotifs();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifs,
        sendNotification: notificationService.sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      refresh: () => {},
      sendNotification: () => {},
    };
  }
  return ctx;
}
