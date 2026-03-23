-- Add custom_pl_label column to pl table for user-defined PL identification
ALTER TABLE pl ADD COLUMN IF NOT EXISTS custom_pl_label text;

-- Add index for efficient lookup by custom label
CREATE INDEX IF NOT EXISTS idx_pl_custom_label ON pl(custom_pl_label);
