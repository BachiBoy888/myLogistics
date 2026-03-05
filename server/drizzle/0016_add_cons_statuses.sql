-- Добавление недостающих статусов в consolidation_status_v2
-- collect_payment (оплата) и to_load (погрузка)
-- ИДЕМПОТЕНТНАЯ: можно запускать многократно без ошибок

-- Добавляем to_load в начало (перед loaded)
DO $$
DECLARE
  v_enum_exists BOOLEAN;
  v_value_exists BOOLEAN;
BEGIN
  -- Проверяем существование enum
  SELECT EXISTS(
    SELECT 1 FROM pg_type 
    WHERE typname = 'consolidation_status_v2' 
    AND typtype = 'e'
  ) INTO v_enum_exists;

  IF NOT v_enum_exists THEN
    RAISE NOTICE 'Enum consolidation_status_v2 не существует, пропускаем';
    RETURN;
  END IF;

  -- Проверяем существование значения
  SELECT EXISTS(
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'consolidation_status_v2'
    AND e.enumlabel = 'to_load'
  ) INTO v_value_exists;

  IF NOT v_value_exists THEN
    ALTER TYPE consolidation_status_v2 ADD VALUE 'to_load' BEFORE 'loaded';
    RAISE NOTICE 'Добавлено значение to_load';
  ELSE
    RAISE NOTICE 'Значение to_load уже существует';
  END IF;
END $$;

-- Добавляем collect_payment перед delivered
DO $$
DECLARE
  v_value_exists BOOLEAN;
BEGIN
  -- Проверяем существование значения
  SELECT EXISTS(
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'consolidation_status_v2'
    AND e.enumlabel = 'collect_payment'
  ) INTO v_value_exists;

  IF NOT v_value_exists THEN
    ALTER TYPE consolidation_status_v2 ADD VALUE 'collect_payment' BEFORE 'delivered';
    RAISE NOTICE 'Добавлено значение collect_payment';
  ELSE
    RAISE NOTICE 'Значение collect_payment уже существует';
  END IF;
END $$;

-- Выводим текущие значения enum для проверки
DO $$
DECLARE
  v_value TEXT;
BEGIN
  RAISE NOTICE 'Текущие значения consolidation_status_v2:';
  FOR v_value IN 
    SELECT e.enumlabel 
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'consolidation_status_v2'
    ORDER BY e.enumsortorder
  LOOP
    RAISE NOTICE '  - %', v_value;
  END LOOP;
END $$;
