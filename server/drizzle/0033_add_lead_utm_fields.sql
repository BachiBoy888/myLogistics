-- Migration: Add UTM fields to leads table
-- Created: 2026-03-22

BEGIN;

-- Add new nullable columns for UTM tracking and lead entry point
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_entry_point TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_leads_lead_entry_point ON leads(lead_entry_point);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);

COMMIT;
