export const STOCK_UNITS = [
  'UNIT',
  'PACK',
  'BOX',
  'BOTTLE',
  'SACK',
  'KG',
  'GRAM',
  'LITER',
  'MILLILITER',
] as const;

export type StockUnit = (typeof STOCK_UNITS)[number];

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  UNIT: 'Unit',
  PACK: 'Pak',
  BOX: 'Kotak',
  BOTTLE: 'Botol',
  SACK: 'Karung',
  KG: 'Kilogram',
  GRAM: 'Gram',
  LITER: 'Liter',
  MILLILITER: 'Mililiter',
};

export const MOVEMENT_ACTIONS = [
  'SET_OPENING_BALANCE',
  'ADD_STOCK',
  'REDUCE_STOCK',
  'ADJUST_TO_PHYSICAL',
  'MARK_DAMAGED',
  'MARK_EXPIRED',
  'RETURN_CUSTOMER',
] as const;

export type MovementAction = (typeof MOVEMENT_ACTIONS)[number];

export const MOVEMENT_TYPES = [
  'IN',
  'OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'DAMAGED',
  'EXPIRED',
  'RETURN_IN',
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const STOCK_STATUS = ['OUT_OF_STOCK', 'LOW', 'AVAILABLE'] as const;
export type StockStatus = (typeof STOCK_STATUS)[number];

export const DECIMAL_QUANTITY_PATTERN = /^(0|[1-9]\d{0,11})(\.\d{1,3})?$/;
