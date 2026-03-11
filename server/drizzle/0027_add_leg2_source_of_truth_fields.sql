-- Migration: Add explicit leg2 source of truth fields
-- 0027_add_leg2_source_of_truth_fields.sql

-- Add manual leg2 fields to PL table (for PLs not in active consolidation)
ALTER TABLE pl
  ADD COLUMN IF NOT EXISTS leg2_manual_amount numeric(15, 2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS leg2_manual_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS leg2_manual_amount_usd numeric(15, 2) DEFAULT '0';

-- Add allocated leg2 fields to consolidation_pl table (for consolidation calculator)
ALTER TABLE consolidation_pl
  ADD COLUMN IF NOT EXISTS client_price_snapshot numeric(12, 2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS allocated_leg2_usd numeric(12, 2) DEFAULT '0';

-- Migrate existing data:
-- Copy current leg2_amount values to leg2_manual_amount for standalone PLs
-- Copy current machine_cost_share to allocated_leg2_usd for consolidation calculator
-- Copy current client_price to client_price_snapshot

UPDATE pl SET
  leg2_manual_amount = leg2_amount,
  leg2_manual_currency = leg2_currency,
  leg2_manual_amount_usd = leg2_amount_usd
WHERE leg2_manual_amount_usd = '0' AND leg2_amount_usd != '0';

UPDATE consolidation_pl SET
  client_price_snapshot = client_price,
  allocated_leg2_usd = machine_cost_share
WHERE allocated_leg2_usd = '0' AND machine_cost_share != '0';
