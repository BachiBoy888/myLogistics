// server/services/cons-validators.js
import { inArray, eq, and } from "drizzle-orm";
import { pl, consolidationPl } from "../db/schema.js";

export const CONS_PIPELINE = [
  "to_load", "loaded", "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed",
];

/** индекс следующего статуса */
export function consNextStatusOf(s) {
  const i = CONS_PIPELINE.indexOf(s);
  return i >= 0 ? CONS_PIPELINE[i + 1] || null : null;
}

/** Только PL со статусом to_load */
export async function ensureAllPLsAreToLoad(db, plIds) {
  if (!plIds?.length) return;
  const ids = plIds.map(Number).filter(Number.isInteger);
  if (ids.length !== plIds.length) throw new Error("plIds must be integers");
  const rows = await db.select({ id: pl.id, status: pl.status }).from(pl).where(inArray(pl.id, ids));
  if (rows.length !== ids.length) throw new Error("Некоторые PL не найдены");
  const bad = rows.filter(r => r.status !== "to_load");
  if (bad.length) {
    const list = bad.map(b => `${b.id}:${b.status}`).join(", ");
    throw new Error(`Допускаются только PL со статусом "to_load". Проблемные: ${list}`);
  }
}

// ранжирование статусов PL по «весу» для проверки отставания
const RANK = new Map([
  ["to_load", 0],
  ["loaded", 1],
  ["to_customs", 2],
  ["released", 3],
  ["kg_customs", 4],
  ["collect_payment", 5],
  ["delivered", 6],
  ["closed", 7],
]);

/** Ни один PL не должен «отставать» от целевого статуса консолидации
 *  При движении назад разрешаем, если все PL >= целевого статуса
 */
export async function assertPLsNotBehind(db, consId, consStatus, isMovingBackward = false) {
  const links = await db.select().from(consolidationPl).where(eq(consolidationPl.consolidationId, consId));
  if (!links.length) return; // пустую консолидацию разрешаем
  const ids = links.map(l => l.plId);
  const rows = await db.select({ id: pl.id, status: pl.status }).from(pl).where(inArray(pl.id, ids));
  const consRank = RANK.get(consStatus) ?? 0;
  
  // При движении назад проверяем, что PL не выше нового статуса слишком сильно
  // (опционально: можно убрать эту проверку полностью для обратного движения)
  if (isMovingBackward) {
    // При движении назад PL должны быть >= новому статусу консолидации
    const ahead = rows.filter(r => (RANK.get(r.status) ?? 999) > consRank + 2); // допускаем небольшой разброс
    if (ahead.length) {
      const list = ahead.map(b => `${b.id}:${b.status}`).join(", ");
      throw new Error(`Некоторые PL слишком опережают статус "${consStatus}": ${list}`);
    }
    return;
  }
  
  const behind = rows.filter(r => (RANK.get(r.status) ?? -1) < consRank);
  if (behind.length) {
    const list = behind.map(b => `${b.id}:${b.status}`).join(", ");
    throw new Error(`Некоторые PL отстают от статуса "${consStatus}": ${list}`);
  }
}