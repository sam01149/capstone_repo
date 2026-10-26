ALTER TABLE "inventory_balances"
  ADD CONSTRAINT "inventory_balances_version_nonnegative_check" CHECK ("version" >= 0);

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_action_check"
    CHECK ("action" IN ('SET_OPENING_BALANCE', 'ADD_STOCK', 'REDUCE_STOCK', 'ADJUST_TO_PHYSICAL', 'MARK_DAMAGED', 'MARK_EXPIRED', 'RETURN_CUSTOMER')),
  ADD CONSTRAINT "stock_movements_reason_code_check"
    CHECK ("reason_code" IN ('OPENING_BALANCE', 'PURCHASE', 'RESTOCK', 'MANUAL_REDUCTION', 'PHYSICAL_COUNT', 'DAMAGED', 'EXPIRED', 'CUSTOMER_RETURN', 'OTHER')),
  ADD CONSTRAINT "stock_movements_reference_pair_check"
    CHECK (("reference_type" IS NULL) = ("reference_id" IS NULL)),
  ADD CONSTRAINT "stock_movements_note_policy_check"
    CHECK (
      "note" IS NOT NULL
      OR (
        "action" NOT IN ('REDUCE_STOCK', 'ADJUST_TO_PHYSICAL', 'MARK_DAMAGED', 'MARK_EXPIRED', 'RETURN_CUSTOMER')
        AND "reason_code" <> 'OTHER'
      )
    );
