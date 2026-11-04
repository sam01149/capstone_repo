export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const;
export const ORDER_SOURCES = ['PUBLIC_WHATSAPP', 'INTERNAL'] as const;
export const ORDER_ACTIONS = [
  'SUBMIT',
  'CONFIRM',
  'COMPLETE',
  'CANCEL',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderSource = (typeof ORDER_SOURCES)[number];
export type OrderAction = (typeof ORDER_ACTIONS)[number];
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const PII_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_ORDER_ITEMS = 20;
