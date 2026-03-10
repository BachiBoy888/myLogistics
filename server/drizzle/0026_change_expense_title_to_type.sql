-- Migration: Change expense title to type enum
-- 0026_change_expense_title_to_type.sql

-- Add new type column
ALTER TABLE consolidation_expenses ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other';

-- Migrate existing data
UPDATE consolidation_expenses SET type = 'customs' WHERE LOWER(title) LIKE '%тамож%' OR LOWER(title) LIKE '%custom%';
UPDATE consolidation_expenses SET type = 'other' WHERE type IS NULL;

-- Drop old title column
ALTER TABLE consolidation_expenses DROP COLUMN IF EXISTS title;

-- Add comment
COMMENT ON COLUMN consolidation_expenses.type IS 'Expense type: customs | other';
