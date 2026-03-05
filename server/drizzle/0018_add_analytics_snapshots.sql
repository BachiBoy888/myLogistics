-- Migration: Add analytics snapshot tables
-- Created: 2026-03-06
-- Note: Enum values to_load and collect_payment already exist (added in 0016, 0017)

-- 1. Daily snapshots for client metrics
CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  day date PRIMARY KEY,
  generated_at timestamptz NOT NULL DEFAULT now(),
  source_ts timestamptz NOT NULL DEFAULT now(),
  total_clients int NOT NULL DEFAULT 0,
  inquiry_clients int NOT NULL DEFAULT 0,
  active_clients int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_day ON analytics_daily_snapshots(day);

-- 2. Daily PL count by status
CREATE TABLE IF NOT EXISTS analytics_daily_pl_status (
  day date NOT NULL,
  status text NOT NULL,
  pl_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, status)
);

CREATE INDEX IF NOT EXISTS idx_analytics_pl_status_day ON analytics_daily_pl_status(day);
CREATE INDEX IF NOT EXISTS idx_analytics_pl_status_status ON analytics_daily_pl_status(status);

-- 3. Daily weight by status
CREATE TABLE IF NOT EXISTS analytics_daily_weight_status (
  day date NOT NULL,
  status text NOT NULL,
  total_weight numeric(15, 3) NOT NULL DEFAULT 0,
  PRIMARY KEY (day, status)
);

CREATE INDEX IF NOT EXISTS idx_analytics_weight_day ON analytics_daily_weight_status(day);
CREATE INDEX IF NOT EXISTS idx_analytics_weight_status ON analytics_daily_weight_status(status);

-- Comments for future employee filter extension
COMMENT ON TABLE analytics_daily_snapshots IS 'Daily stock metrics for clients. TODO: add employee_id column for per-employee filtering';
COMMENT ON TABLE analytics_daily_pl_status IS 'Daily PL count by status. TODO: add employee_id column for per-employee filtering';
COMMENT ON TABLE analytics_daily_weight_status IS 'Daily weight by status. TODO: add employee_id column for per-employee filtering';
