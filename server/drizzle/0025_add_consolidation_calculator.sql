-- Migration: add consolidation expenses table and profit calculator fields
-- Table for additional consolidation expenses
CREATE TABLE IF NOT EXISTS consolidation_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_id UUID NOT NULL REFERENCES consolidations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  comment TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consolidation_expenses_cons ON consolidation_expenses(consolidation_id);

-- Add fields to consolidation_pl for profit calculator
ALTER TABLE consolidation_pl ADD COLUMN IF NOT EXISTS client_price NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE consolidation_pl ADD COLUMN IF NOT EXISTS machine_cost_share NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE consolidation_pl ADD COLUMN IF NOT EXISTS allocation_mode TEXT DEFAULT 'auto'; -- 'auto' | 'manual'

-- Add machine cost field to consolidations
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS machine_cost NUMERIC(12, 2) DEFAULT 0;
