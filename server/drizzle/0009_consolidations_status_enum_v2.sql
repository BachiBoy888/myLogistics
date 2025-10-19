-- Новый enum (цепочка с этапа Погружено)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consolidation_status_v2') THEN
    CREATE TYPE consolidation_status_v2 AS ENUM ('loaded','to_customs','released','kg_customs','delivered','closed');
  END IF;
END $$;

-- Если колонка уже существовала с другим типом — мигрируем
DO $$
DECLARE
  coltype TEXT;
BEGIN
  SELECT pg_type.typname INTO coltype
  FROM pg_type
  JOIN pg_attribute ON pg_attribute.atttypid = pg_type.oid
  JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
  WHERE pg_class.relname = 'consolidations' AND pg_attribute.attname = 'status' AND pg_attribute.attnum > 0;

  IF coltype IS DISTINCT FROM 'consolidation_status_v2' THEN
    ALTER TABLE consolidations
      ALTER COLUMN status TYPE consolidation_status_v2
      USING status::text::consolidation_status_v2;

    ALTER TABLE consolidations
      ALTER COLUMN status SET DEFAULT 'loaded';
  END IF;
END $$;