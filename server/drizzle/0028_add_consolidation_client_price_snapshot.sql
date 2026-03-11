-- Migration: Add missing client_price_snapshot column to consolidation_pl
-- 0028_add_consolidation_client_price_snapshot.sql
-- This fixes the schema drift from migration 0027 which was missing this column

-- Add missing column
ALTER TABLE consolidation_pl
  ADD COLUMN IF NOT EXISTS client_price_snapshot numeric(12, 2) DEFAULT '0';

-- Migrate existing data: copy client_price to client_price_snapshot
UPDATE consolidation_pl SET
  client_price_snapshot = client_price
WHERE client_price_snapshot = '0' AND client_price != '0';
