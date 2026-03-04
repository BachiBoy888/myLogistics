// src/constants/statuses.js
// Статусы, этапы, маппинг и хелперы переходов

// Все возможные статусы PL
export const Statuses = [
  "draft",
  "awaiting_docs",
  "awaiting_load",      // NEW: Сбор груза
  "to_load",
  "loaded",
  "to_customs",
  "released",
  "kg_customs",
  "collect_payment",    // NEW: Оплата (вместо delivered)
  "closed",
  "cancelled",
];

// Человекочитаемая подпись статуса
export const humanStatus = (s) =>
  ({
    draft: "Обращение",
    awaiting_docs: "Сбор документов",
    awaiting_load: "Сбор груза",
    to_load: "На погрузку",
    loaded: "Погружено",
    to_customs: "Оформление Китай",
    released: "В пути",
    kg_customs: "Растаможка",
    collect_payment: "Оплата",
    closed: "Закрыто",
    cancelled: "Отменено",
  }[s] || s);

// Цвет бейджа для статуса
export const badgeColorByStatus = (s) =>
  ({
    draft: "bg-gray-100 text-gray-700",
    awaiting_docs: "bg-amber-100 text-amber-700",
    awaiting_load: "bg-orange-100 text-orange-700",     // orange-ish для сбора груза
    to_load: "bg-blue-100 text-blue-700",
    loaded: "bg-blue-200 text-blue-800",
    to_customs: "bg-purple-100 text-purple-700",
    released: "bg-emerald-100 text-emerald-700",
    kg_customs: "bg-violet-100 text-violet-700",
    collect_payment: "bg-teal-100 text-teal-700",       // teal-ish для оплаты
    closed: "bg-zinc-200 text-zinc-800",
    cancelled: "bg-rose-100 text-rose-700",
  }[s] || "bg-gray-100 text-gray-700");

// Этапы и их порядок (9 колонок канбана)
export const StageLabels = {
  intake: "1. Обращение",
  collect_docs: "2. Сбор документов",
  collect_cargo: "3. Сбор груза",
  loading: "4. Погрузка",
  cn_formalities: "5. Оформление Китай",
  in_transit: "6. В пути",
  kg_customs: "7. Растаможка",
  payment: "8. Оплата",
  closed_stage: "9. Закрыто",
};

export const OrderedStages = [
  "intake",
  "collect_docs",
  "collect_cargo",
  "loading",
  "cn_formalities",
  "in_transit",
  "kg_customs",
  "payment",
  "closed_stage",
];

// Маппинг статуса в этап (новая схема)
export function stageOf(plStatus) {
  if (plStatus === "draft") return "intake";
  if (plStatus === "awaiting_docs") return "collect_docs";
  if (plStatus === "awaiting_load") return "collect_cargo";
  if (plStatus === "to_load" || plStatus === "loaded") return "loading";
  if (plStatus === "to_customs") return "cn_formalities";
  if (plStatus === "released") return "in_transit";
  if (plStatus === "kg_customs") return "kg_customs";
  if (plStatus === "collect_payment") return "payment";
  if (plStatus === "closed" || plStatus === "cancelled") return "closed_stage";
  return "intake";
}

// Линейка переходов статусов (обновленная)
export const StatusPipeline = [
  "draft",
  "awaiting_docs",
  "awaiting_load",
  "to_load",
  "loaded",
  "to_customs",
  "released",
  "kg_customs",
  "collect_payment",
  "closed",
];

// Следующий статус
export function nextStatusOf(currentStatus) {
  const i = StatusPipeline.indexOf(currentStatus);
  if (i === -1) return null;
  return StatusPipeline[i + 1] || null;
}

// Подсказка «следующий этап» (лейбл)
export function nextStageLabelOf(currentStatus) {
  const st = stageOf(currentStatus);
  const idx = OrderedStages.indexOf(st);
  const nextStageKey = OrderedStages[idx + 1] || null;
  return nextStageKey ? StageLabels[nextStageKey] : null;
}

// Для консолидаций используем тот же человекочитаемый статус и цвета
export const humanConsStatus = humanStatus;
export const badgeColorByConsStatus = badgeColorByStatus;

// Следующий статус для консолидации — та же линейка
export function consNextStatusOf(currentStatus) {
  const i = StatusPipeline.indexOf(currentStatus);
  if (i === -1) return null;
  return StatusPipeline[i + 1] || null;
}
