ALTER TABLE "clients" ADD COLUMN "normalized_name" text;
-- Enable extensions (idempotent)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_trgm';
  IF NOT FOUND THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  END IF;

  PERFORM 1 FROM pg_extension WHERE extname = 'unaccent';
  IF NOT FOUND THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS unaccent';
  END IF;
END$$;

-- Backfill normalized_name из name по правилу lower(unaccent(name))
UPDATE public.clients
SET normalized_name = lower(unaccent(name))
WHERE normalized_name IS NULL;

-- Триграммный индекс для быстрого похожего поиска
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='idx_clients_normalized_trgm'
  ) THEN
    EXECUTE 'CREATE INDEX idx_clients_normalized_trgm
             ON public.clients
             USING GIN (normalized_name gin_trgm_ops)';
  END IF;
END$$;

-- Точные индексы (для быстрых проверок дублей)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='clients' AND column_name='email'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='idx_clients_email'
  ) THEN
    EXECUTE 'CREATE INDEX idx_clients_email ON public.clients (email)';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='clients' AND column_name='phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='idx_clients_phone'
  ) THEN
    EXECUTE 'CREATE INDEX idx_clients_phone ON public.clients (phone)';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='clients' AND column_name='phone2'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='idx_clients_phone2'
  ) THEN
    EXECUTE 'CREATE INDEX idx_clients_phone2 ON public.clients (phone2)';
  END IF;
END$$;