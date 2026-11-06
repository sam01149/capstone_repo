import { INITIAL_NOTIFICATIONS } from '../mocks/ordersAndInventoryData';
import { delay, request, USE_REAL_BACKEND } from './apiClient';

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
    if (USE_REAL_BACKEND) return request(`/notifications?role=${role}`);
    await delay(100);
    const list = getLocalNotifs();
    if (role === 'ALL' || role === 'SUPER_ADMIN') return list;
    return list.filter((n) => n.roleTarget === role || n.roleTarget === 'ALL');
  },

  async markAsRead(id) {
    if (USE_REAL_BACKEND) return request(`/notifications/${id}/read`, { method: 'PATCH' });
    const list = getLocalNotifs();
    const notif = list.find((n) => n.id === id);
    if (notif) notif.isRead = true;
    saveLocalNotifs(list);
    return true;
  },

  async markAllAsRead(role = 'ALL') {
    if (USE_REAL_BACKEND) return request(`/notifications/mark-all-read`, { method: 'PATCH', body: JSON.stringify({ role }) });
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

