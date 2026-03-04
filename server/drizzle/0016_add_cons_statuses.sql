-- Добавление недостающих статусов в consolidation_status_v2
-- collect_payment (оплата) и to_load (погрузка)

DO $$ BEGIN
  -- Добавляем to_load перед loaded (в начало)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'to_load' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'consolidation_status_v2')
  ) THEN
    ALTER TYPE consolidation_status_v2 ADD VALUE 'to_load' BEFORE 'loaded';
  END IF;
END $$;

DO $$ BEGIN
  -- Добавляем collect_payment перед delivered
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'collect_payment' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'consolidation_status_v2')
  ) THEN
    ALTER TYPE consolidation_status_v2 ADD VALUE 'collect_payment' BEFORE 'delivered';
  END IF;
END $$;
