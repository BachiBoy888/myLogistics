-- Migration: add capacity fields to consolidations table
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC(12, 3) DEFAULT 0;
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS capacity_cbm NUMERIC(12, 3) DEFAULT 0;

-- Add load_order field to consolidation_pl for tracking loading sequence
ALTER TABLE consolidation_pl ADD COLUMN IF NOT EXISTS load_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_consolidation_pl_order ON consolidation_pl(consolidation_id, load_order);
