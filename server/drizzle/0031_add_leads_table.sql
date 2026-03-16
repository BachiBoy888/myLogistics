-- Create leads table for public calculator → lead capture flow

-- Create enum type for lead status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
    END IF;
END$$;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Contact information
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    email TEXT,
    note TEXT,

    -- Source and status
    source TEXT NOT NULL DEFAULT 'website_calculator',
    status lead_status NOT NULL DEFAULT 'new',

    -- Cargo parameters (from calculator)
    cargo_name TEXT,
    weight NUMERIC(12, 3),
    volume NUMERIC(12, 3),
    origin_city TEXT,
    destination_city TEXT,
    delivery_type TEXT, -- 'air' | 'road' | 'express'

    -- Calculation result snapshot
    estimated_price NUMERIC(15, 2),
    estimated_currency TEXT DEFAULT 'USD',
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    calculator_snapshot JSONB DEFAULT '{}'::jsonb,

    -- Operational fields
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    converted_pl_id INTEGER REFERENCES pl(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_manager ON leads(manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_pl ON leads(converted_pl_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();
