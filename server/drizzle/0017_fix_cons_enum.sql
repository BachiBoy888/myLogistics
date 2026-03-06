-- Fallback миграция: исправление enum consolidation_status_v2
-- Выполняется если 0016 не сработала

DO $$
DECLARE
  enum_rec RECORD;
  current_vals TEXT[];
  expected_vals TEXT[] := ARRAY['to_load', 'loaded', 'to_customs', 'released', 'kg_customs', 'collect_payment', 'delivered', 'closed'];
  missing_vals TEXT[];
  v_val TEXT;
BEGIN
  -- Получаем текущие значения
  SELECT ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder)
  INTO current_vals
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'consolidation_status_v2';

  RAISE NOTICE 'Текущие значения enum: %', current_vals;
  RAISE NOTICE 'Ожидаемые значения: %', expected_vals;

  -- Находим недостающие
  SELECT ARRAY_AGG(v)
  INTO missing_vals
  FROM unnest(expected_vals) v
  WHERE NOT v = ANY(current_vals);

  IF missing_vals IS NULL OR array_length(missing_vals, 1) = 0 THEN
    RAISE NOTICE 'Все значения на месте, миграция не требуется';
    RETURN;
  END IF;

  RAISE NOTICE 'Недостающие значения: %', missing_vals;

  -- Добавляем недостающие значения
  FOREACH v_val IN ARRAY missing_vals
  LOOP
    CASE v_val
      WHEN 'to_load' THEN
        EXECUTE 'ALTER TYPE consolidation_status_v2 ADD VALUE ''to_load'' BEFORE ''loaded''';
        RAISE NOTICE 'Добавлено: to_load';
      WHEN 'collect_payment' THEN
        EXECUTE 'ALTER TYPE consolidation_status_v2 ADD VALUE ''collect_payment'' BEFORE ''delivered''';
        RAISE NOTICE 'Добавлено: collect_payment';
      ELSE
        EXECUTE format(
          'ALTER TYPE consolidation_status_v2 ADD VALUE %L',
          v_val
        );
        RAISE NOTICE 'Добавлено: %', v_val;
    END CASE;
  END LOOP;
  RAISE NOTICE 'Миграция завершена успешно';
END $$;
