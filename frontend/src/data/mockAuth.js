// FarmSight Mock Authentication & Role Data
// UMKM Toko Farm Berkah - Capstone Project

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STOCK_MANAGER: 'STOCK_MANAGER',
  SALES_ADMIN: 'SALES_ADMIN',
};

export const ROLE_DETAILS = {
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    label: 'Pemilik & Super Admin',
    color: '#1b4332',
    bg: '#d8f3dc',
    border: '#74c69d',
    permissions: [
      'view_dashboard',
      'view_products',
      'manage_products',
      'view_inventory',
      'manage_inventory',
      'view_stock_movement',
      'manage_stock_movement',
      'view_orders',
      'manage_orders',
      'view_forecasting',
      'manage_forecasting',
      'view_recommendations',
      'view_reports',
      'export_reports',
      'manage_users',
      'view_notifications',
    ],
  },
  [ROLES.STOCK_MANAGER]: {
    id: ROLES.STOCK_MANAGER,
    name: 'Stock Manager',
    label: 'Manajer Stok & Gudang',
    description: 'Fokus pada pengelolaan stok fisik, pencatatan stock movement (in/out/damaged), pemantauan safety stock, dan reorder point.',
    color: '#065f46',
    bg: '#d1fae5',
    border: '#6ee7b7',
    permissions: [
      'view_dashboard',
      'view_products',
      'view_inventory',
      'manage_inventory',
      'view_stock_movement',
      'manage_stock_movement',
      'view_recommendations',
      'view_reports',
      'export_reports',
      'view_notifications',
    ],
  },
  [ROLES.SALES_ADMIN]: {
    id: ROLES.SALES_ADMIN,
    name: 'Sales Admin',
    label: 'Admin Penjualan & Pesanan',
    description: 'Fokus pada penerimaan dan pemrosesan pesanan pelanggan, verifikasi ketersediaan stok, dan status pesanan.',
    color: '#92400e',
    bg: '#fef3c7',
    border: '#fcd34d',
    permissions: [
      'view_dashboard',
      'view_products',
      'view_inventory_summary',
      'view_orders',
      'manage_orders',
      'view_reports_sales',
      'view_notifications',
    ],
  },
};

export const INITIAL_ACCOUNTS = [
  {
    id: 'usr-001',
    name: 'Ibu Intan Permatasari',
    email: 'admin@farmberkah.com',
    password: 'admin12345',
    role: ROLES.SUPER_ADMIN,
    roleTitle: 'Pemilik Toko Farm Berkah',
    phone: '+62 813-1000-3455',
    avatar: 'IP',
    status: 'Aktif',
    lastLogin: '2026-10-09 15:30',
    createdAt: '2024-01-15',
  },
  {
    id: 'usr-002',
    name: 'Budi Santoso',
    email: 'stock@farmberkah.com',
    password: 'stock12345',
    role: ROLES.STOCK_MANAGER,
    roleTitle: 'Koordinator Gudang & Persediaan',
    phone: '+62 813-9876-5432',
    avatar: 'BS',
    status: 'Aktif',
    lastLogin: '2026-10-09 14:15',
    createdAt: '2024-03-10',
  },
  {
    id: 'usr-003',
    name: 'Siti Rahmawati',
    email: 'sales@farmberkah.com',
    password: 'sales12345',
    role: ROLES.SALES_ADMIN,
    roleTitle: 'Staff Operasional Penjualan',
    phone: '+62 857-1122-3344',
    avatar: 'SR',
    status: 'Aktif',
    lastLogin: '2026-10-09 16:05',
    createdAt: '2024-04-01',
  },
];

// Helper functions for LocalStorage mock database
const STORAGE_KEY_USERS = 'farmsight_users_db_v1';
const STORAGE_KEY_SESSION = 'farmsight_active_session_v1';

export function getStoredUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_ACCOUNTS;
  }
}

export function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users', err);
  }
}

export function getStoredSession() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (err) {
    console.error('Failed to update session', err);
  }
}
