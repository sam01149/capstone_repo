ALTER TABLE orders ADD COLUMN payment JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD CONSTRAINT orders_payment_object CHECK (jsonb_typeof(payment) = 'object');
