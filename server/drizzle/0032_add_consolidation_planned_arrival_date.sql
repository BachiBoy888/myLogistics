-- Migration: Add planned_arrival_date to consolidations
ALTER TABLE consolidations ADD COLUMN planned_arrival_date TEXT;
