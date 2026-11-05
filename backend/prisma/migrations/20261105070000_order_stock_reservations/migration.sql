-- Forward migration: existing SALE_OUT balances must never be restored or deducted twice.
ALTER TABLE inventory_balances ADD COLUMN reserved_stock DECIMAL(15,3) NOT NULL DEFAULT 0;
ALTER TABLE inventory_balances ADD CONSTRAINT inventory_reserved_stock_check
  CHECK (reserved_stock >= 0 AND reserved_stock <= current_stock);

ALTER TABLE orders ADD COLUMN stock_deducted_at TIMESTAMPTZ(6);
UPDATE orders o SET stock_deducted_at = movement.occurred_at
FROM (
  SELECT i.order_id, MIN(m.occurred_at) AS occurred_at
  FROM order_items i JOIN stock_movements m ON m.order_item_id = i.id AND m.type = 'SALE_OUT'
  GROUP BY i.order_id
) movement WHERE o.id = movement.order_id;
CREATE INDEX orders_stock_deducted_at_idx ON orders(stock_deducted_at);

ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_action_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_action_check CHECK
  (action IN ('SET_OPENING_BALANCE','ADD_STOCK','REDUCE_STOCK','ADJUST_TO_PHYSICAL',
    'MARK_DAMAGED','MARK_EXPIRED','RETURN_CUSTOMER','CONFIRM_ORDER','COMPLETE_ORDER'));
