-- Migration: Add FX and leg amount fields to calculator storage
-- Created: 2026-03-06

-- Добавляем поля для хранения сумм плеч и курсов валют в таблице pl
-- (храним в отдельных колонках для индексации и стабильности)

ALTER TABLE pl 
ADD COLUMN IF NOT EXISTS leg1_amount numeric(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg1_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS leg1_amount_usd numeric(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg1_usd_per_kg numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg1_usd_per_m3 numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg2_amount numeric(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg2_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS leg2_amount_usd numeric(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg2_usd_per_kg numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leg2_usd_per_m3 numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fx_source text,
ADD COLUMN IF NOT EXISTS fx_date text,
ADD COLUMN IF NOT EXISTS fx_usd_kgs numeric(10, 4),
ADD COLUMN IF NOT EXISTS fx_cny_kgs numeric(10, 4),
ADD COLUMN IF NOT EXISTS fx_saved_at timestamptz;

-- Индексы для быстрого поиска по курсам
CREATE INDEX IF NOT EXISTS idx_pl_fx_date ON pl(fx_date) WHERE fx_date IS NOT NULL;
