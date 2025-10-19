-- UUID генератор (на Render обычно уже есть, но на всякий случай)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Последовательность для автонумерации CONS-YYYY-N (по желанию)
CREATE SEQUENCE IF NOT EXISTS cons_seq;

-- Таблица консолидаций
CREATE TABLE IF NOT EXISTS consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cons_number TEXT UNIQUE NOT NULL,                -- например, CONS-2025-42
  title TEXT,
  status consolidation_status_v2 NOT NULL DEFAULT 'loaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consolidations_cons_number ON consolidations (cons_number);
CREATE INDEX IF NOT EXISTS idx_consolidations_status ON consolidations (status);

-- Связь M:N с PL (у тебя pl.id = INTEGER)
CREATE TABLE IF NOT EXISTS consolidation_pl (
  consolidation_id UUID NOT NULL REFERENCES consolidations(id) ON DELETE CASCADE,
  pl_id INTEGER NOT NULL REFERENCES pl(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_consolidation_pl UNIQUE (consolidation_id, pl_id)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_pl_cons ON consolidation_pl (consolidation_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_pl_pl ON consolidation_pl (pl_id);

-- История статусов
CREATE TABLE IF NOT EXISTS consolidation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_id UUID NOT NULL REFERENCES consolidations(id) ON DELETE CASCADE,
  from_status consolidation_status_v2,
  to_status consolidation_status_v2 NOT NULL,
  note TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cons_status_history_cons ON consolidation_status_history (consolidation_id);
CREATE INDEX IF NOT EXISTS idx_cons_status_history_to ON consolidation_status_history (to_status);