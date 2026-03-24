-- Migration: add drivers JSONB array to consolidations table
-- Drivers are stored as: [{ "name": "...", "phone": "...", "vehicleNumber": "..." }]

ALTER TABLE consolidations
ADD COLUMN IF NOT EXISTS drivers jsonb DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN consolidations.drivers IS 'Array of driver objects: [{name, phone, vehicleNumber}]';
