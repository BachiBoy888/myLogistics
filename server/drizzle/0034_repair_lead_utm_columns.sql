-- Migration: 0034_repair_lead_utm_columns
-- Purpose: Idempotent repair migration to ensure lead UTM columns exist
-- This migration guards against journal drift and missing column scenarios
-- Safe to run multiple times (IF NOT EXISTS)

-- Repair: Add lead_entry_point if missing
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_entry_point TEXT;

-- Repair: Add UTM tracking columns if missing
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS utm_source TEXT;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS utm_medium TEXT;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Create indexes if they don't exist (for query performance)
CREATE INDEX IF NOT EXISTS idx_leads_lead_entry_point ON leads(lead_entry_point);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
