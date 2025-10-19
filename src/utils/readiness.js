// src/utils/readiness.js
// Готовность документов и требования к переходам статусов

// 0/10/50/100 для документа с поправкой на статус PL
export function percentForDoc(docStatus, plStatus) {
  if (docStatus === "rejected") return 0;
  if (docStatus === "recheck_ok") {
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
  if (docStatus === "checked_by_logistic") return 50;
  if (docStatus === "uploaded") return 10;
  return 10;
}

// Средняя готовность PL по ключевым документам
export function readinessForPL(pl) {
  const map = Object.fromEntries((pl?.docs || []).map((d) => [d.type, d]));
  const inv = map["invoice"];
  const pld = map["packing_list"];
  if (!inv || !pld) return 0;

  const a = percentForDoc(inv.status, pl.status);
  const b = percentForDoc(pld.status, pl.status);
  const avg = Math.round((a + b) / 2);

  // Особый случай: «Погрузка» — почти готово, но не 100
  if (
    pl.status === "to_load" &&
    (inv.status !== "recheck_ok" || pld.status !== "recheck_ok")
  ) {
    return 90;
  }
  return avg;
}

// Можно ли выпускать/вести дальше без стопоров
export function canAllowToShip(pl) {
  const r = readinessForPL(pl);
  const map = Object.fromEntries((pl?.docs || []).map((d) => [d.type, d]));
  return (
    r >= 100 &&
    map.invoice?.status === "recheck_ok" &&
    map.packing_list?.status === "recheck_ok"
  );
}

// Требования для перехода к следующему статусу (UI-подсказки)
function docChecked(pl, type) {
  const d = (pl?.docs || []).find((x) => x.type === type);
  return d && (d.status === "checked_by_logistic" || d.status === "recheck_ok");
}

export function requirementsResult(pl) {
  const cur = pl.status;

  if (cur === "draft") {
    const ok =
      !!pl.quote &&
      typeof pl.quote.client_price === "number" &&
      pl.quote.client_price > 0;
    return {
      ok,
      need: ok
        ? null
        : "Озвучьте цену клиенту и сохраните её (поле «Цена для клиента, $» → «Сохранить расчёт»).",
    };
  }

  if (cur === "awaiting_docs") {
    const inv = docChecked(pl, "invoice");
    const plDoc = docChecked(pl, "packing_list");
    const insp = docChecked(pl, "inspection");
    const ok = inv && plDoc && insp;
    return {
      ok,
      need: ok
        ? null
        : "Загрузите и отметьте как «Проверено»: Инвойс (с переводом), Упаковочный лист, Осмотр.",
    };
  }

  if (cur === "to_load" || cur === "loaded") {
    return { ok: true, need: null };
  }

  if (cur === "to_customs") {
    const pre = docChecked(pl, "pre_declaration");
    return {
      ok: !!pre,
      need: pre
        ? null
        : "Загрузите «Предварительное информирование» и отметьте его как «Проверено».",
    };
  }

  if (["released", "kg_customs", "delivered"].includes(cur)) {
    return { ok: true, need: null };
  }

  if (cur === "closed") return { ok: false, need: null };

  return { ok: false, need: null };
}