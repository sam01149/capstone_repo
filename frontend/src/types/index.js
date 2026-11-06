// FarmSight System Enums & Types
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STOCK_MANAGER: 'STOCK_MANAGER',
  SALES_ADMIN: 'SALES_ADMIN',
  GUEST: 'GUEST',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  STOCK_MANAGER: 'Stock Manager',
  SALES_ADMIN: 'Sales Admin',
  GUEST: 'Guest / Customer',
};

export const ORDER_STATUS = {
  MENUNGGU_KONFIRMASI: 'MENUNGGU_KONFIRMASI',
  MENUNGGU_PEMBAYARAN: 'MENUNGGU_PEMBAYARAN', // Stok direservasi
  PERLU_TRANSFER_ULANG: 'PERLU_TRANSFER_ULANG',
  DIKONFIRMASI: 'DIKONFIRMASI', // Pembayaran diverifikasi, stok dipotong
  DIPROSES: 'DIPROSES',
  SELESAI: 'SELESAI',
  DIBATALKAN: 'DIBATALKAN',
};

export const STOCK_STATUS = {
  AMAN: 'AMAN',
  PERLU_RESTOCK: 'PERLU_RESTOCK', // <= ROP
  KRITIS: 'KRITIS', // <= Safety Stock
  HABIS: 'HABIS',
};

export const MOVEMENT_TYPE = {
  IN: 'IN',
  OUT: 'OUT',
  RESERVATION: 'RESERVATION',
  RELEASE_RESERVATION: 'RELEASE_RESERVATION',
};

export const FORECAST_METHOD = {
  ARIMA: 'ARIMA(1,1,0)',
  CROSTON_SBA: 'Croston SBA',
};

