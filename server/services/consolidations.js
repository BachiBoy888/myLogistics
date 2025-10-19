// server/services/consolidations.js
import { sql } from "drizzle-orm";

/**
 * Надёжная генерация CONS-YYYY-N:
 * 1) пытаемся создать последовательность (если нет) — без ошибок при наличии
 * 2) берём nextval
 * 3) если что-то пошло не так — используем фолбэк на основе времени
 */
export async function nextConsNumber(db) {
  const y = new Date().getFullYear();

  try {
    // создадим последовательность, если её нет (не упадёт, если уже есть)
    await db.execute(sql`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'cons_seq') THEN
        CREATE SEQUENCE cons_seq;
      END IF;
    END$$;`);

    const [{ nextval }] = await db.execute(sql`SELECT nextval('cons_seq')`);
    return `CONS-${y}-${nextval}`;
  } catch (e) {
    // фолбэк — уникальный и читаемый
    const ts = Date.now().toString().slice(-7);
    const rand = Math.floor(Math.random() * 899) + 100; // 3 цифры
    return `CONS-${y}-${ts}${rand}`;
  }
}