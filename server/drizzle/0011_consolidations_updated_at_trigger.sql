-- Универсальная функция обновления updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для consolidations
DROP TRIGGER IF EXISTS trg_consolidations_updated_at ON consolidations;
CREATE TRIGGER trg_consolidations_updated_at
BEFORE UPDATE ON consolidations
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();