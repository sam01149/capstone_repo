export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STOCK_MANAGER: 'STOCK_MANAGER',
  SALES_ADMIN: 'SALES_ADMIN',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ACCESS_COOKIE = 'farmsight_access';
export const REFRESH_COOKIE = 'farmsight_refresh';
export const CSRF_COOKIE = 'farmsight_csrf';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
