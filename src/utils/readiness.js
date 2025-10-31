// src/utils/readiness.js
// Готовность документов и требования к переходам статусов

/** ===== Нормализация статусов документов (UI + серверные зеркала) ===== */
function normalizeDocStatus(status) {
  const s = String(status || "").toLowerCase();

  // UI-статусы
  if (s === "uploaded") return "uploaded";
  if (s === "checked_by_logistic") return "checked_by_logistic";
  if (s === "recheck_ok") return "recheck_ok";
  if (s === "rejected") return "rejected";

  // Серверные варианты
  if (s === "pending") return "uploaded";
  if (s === "reviewed") return "checked_by_logistic";
  if (s === "approved") return "recheck_ok";

  // дефолт — как загружен
  return "uploaded";
}

/** Вес прогресса по статусу документа */
const READY_WEIGHT = {
  rejected: 0,
  uploaded: 10,
  checked_by_logistic: 50,
  recheck_ok: 100,
};

/** Обязательные документы для этапа ожидания доков */
export const REQUIRED_DOC_TYPES = ["invoice", "packing_list", "inspection"];

/** Достаём документ по типу (учитываем разные поля: type/docType/doctype/kind) */
function docOf(pl, type) {
  const arr = Array.isArray(pl?.docs) ? pl.docs : [];
  return (
    arr.find((d) => {
      const t = d?.type ?? d?.docType ?? d?.doctype ?? d?.kind;
      return String(t || "").toLowerCase() === type;
    }) || null
  );
}

/** Док считается проверенным логистом */
function isCheckedByLogistic(doc) {
  const st = normalizeDocStatus(doc?.status);
  return st === "checked_by_logistic" || st === "recheck_ok";
}

/** ===== ПУБЛИЧНЫЕ (совместимые) ЭКСПОРТЫ ===== */

/** 0/10/50/100 для документа с поправкой на статус PL (совместимо со старым API) */
export function percentForDoc(docStatus, plStatus) {
  const st = normalizeDocStatus(docStatus);

  if (st === "rejected") return 0;

  if (st === "recheck_ok") {
    // 100% разрешаем только на «поздних» стадиях
    const allow100 = [
      "to_load",
      "loaded",
      "to_customs",
      "released",
      "kg_customs",
      "delivered",
      "closed",
    ].includes(plStatus);
    return allow100 ? 100 : 50;
  }

  if (st === "checked_by_logistic") return 50;
  if (st === "uploaded") return 10;
  return 10;
}

/** Средняя готовность PL по обязательным документам */
export function readinessForPL(pl) {
  // если совсем нет docs
  const arr = Array.isArray(pl?.docs) ? pl.docs : [];
  if (arr.length === 0) return 0;

  // обязательные
  const inv = docOf(pl, "invoice");
  const pld = docOf(pl, "packing_list");
  const insp = docOf(pl, "inspection");

  // если чего-то из обязательного нет — 0%
  if (!inv || !pld || !insp) return 0;

  const a = percentForDoc(inv.status, pl.status);
  const b = percentForDoc(pld.status, pl.status);
  const c = percentForDoc(insp.status, pl.status);
  const avg = Math.round((a + b + c) / 3);

  // Особый случай: «Погрузка» — почти готово, но не 100, если не все recheck_ok
  const allRecheck =
    normalizeDocStatus(inv.status) === "recheck_ok" &&
    normalizeDocStatus(pld.status) === "recheck_ok" &&
    normalizeDocStatus(insp.status) === "recheck_ok";

  if (pl.status === "to_load" && !allRecheck) {
    return Math.max(avg, 90);
  }

  return avg;
}

/** Готов ли к выпуску (историческое правило: invoice + packing_list = recheck_ok) */
export function canAllowToShip(pl) {
  const r = readinessForPL(pl);
  const invOk = normalizeDocStatus(docOf(pl, "invoice")?.status) === "recheck_ok";
  const pldOk = normalizeDocStatus(docOf(pl, "packing_list")?.status) === "recheck_ok";
  return r >= 100 && invOk && pldOk;
}

/** Требования для перехода к следующему статусу (UI-подсказки) */
export function requirementsResult(pl) {
  const cur = pl?.status || "draft";

  // словарь для читаемых подсказок
  const human = {
    invoice: "Инвойс (с переводом)",
    packing_list: "Упаковочный лист",
    inspection: "Осмотр",
    pre_declaration: "Предварительное информирование",
  };
  const listToHuman = (types) => types.map((t) => human[t] || t).join(", ");

  // draft → нужна цена клиенту
  if (cur === "draft") {
    const ok =
      !!pl?.quote &&
      typeof pl.quote.client_price === "number" &&
      pl.quote.client_price > 0;
    return {
      ok,
      need: ok
        ? null
        : "Озвучьте цену клиенту и сохраните её (поле «Цена для клиента, $» → «Сохранить расчёт»).",
    };
  }

  // awaiting_docs → нужны обязательные доки, отмеченные как «Проверено»
  if (cur === "awaiting_docs") {
    const missing = [];
    const notChecked = [];

    for (const type of REQUIRED_DOC_TYPES) {
      const d = docOf(pl, type);
      if (!d) {
        missing.push(type);
      } else if (!isCheckedByLogistic(d)) {
        notChecked.push(type);
      }
    }

    const ok = missing.length === 0 && notChecked.length === 0;
    return {
      ok,
      need: ok
        ? null
        : [
            missing.length ? `Загрузите: ${listToHuman(missing)}.` : "",
            notChecked.length
              ? `Отметьте как «Проверено»: ${listToHuman(notChecked)}.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
    };
  }

  // to_customs → нужна «Предварительная декларация» проверенная логистом
  if (cur === "to_customs") {
    const pre = docOf(pl, "pre_declaration");
    const ok = !!pre && isCheckedByLogistic(pre);
    return {
      ok,
      need: ok
        ? null
        : "Загрузите «Предварительное информирование» и отметьте его как «Проверено».",
    };
  }

  // Прочие этапы — без дополнительных стопоров
  if (["to_load", "loaded", "released", "kg_customs", "delivered"].includes(cur)) {
    return { ok: true, need: null };
  }

  // Закрытый — переходов нет
  if (cur === "closed") return { ok: false, need: null };

  // На всякий случай дефолт
  return { ok: false, need: null };
}