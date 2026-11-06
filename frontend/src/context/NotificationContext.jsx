import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

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
      clearAll: () => {},
    };
  }
  return ctx;
}

