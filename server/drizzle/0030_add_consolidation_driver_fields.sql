-- Add driver fields to consolidations table
ALTER TABLE consolidations
  ADD COLUMN driver_name TEXT,
  ADD COLUMN driver_contacts TEXT;