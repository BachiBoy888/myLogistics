// src/utils/status.js
// Все статусы PL, этапы, и утилиты переходов

export const Statuses = [
  "draft",
  "awaiting_docs",
  "to_load",
  "loaded",
  "to_customs",
  "released",
  "kg_customs",
  "delivered",
  "closed",
  "cancelled",
];

export const humanStatus = (s) =>
  ({
    draft: "Черновик",
    awaiting_docs: "Ожидаем документы",
    to_load: "На погрузку",
    loaded: "Погружено",
    to_customs: "Оформление Китай",
    released: "В пути",
    kg_customs: "Растаможка Кыргызстан",
    delivered: "Оплата",
    closed: "Закрыто",
    cancelled: "Отменено",
  }[s] || s);

export const badgeColorByStatus = (s) =>
  ({
    draft: "bg-gray-100 text-gray-700",
    awaiting_docs: "bg-amber-100 text-amber-700",
    to_load: "bg-blue-100 text-blue-700",
    loaded: "bg-blue-200 text-blue-800",
    to_customs: "bg-purple-100 text-purple-700",
    released: "bg-emerald-100 text-emerald-700",
    kg_customs: "bg-violet-100 text-violet-700",
    delivered: "bg-teal-100 text-teal-700",
    closed: "bg-zinc-200 text-zinc-800",
    cancelled: "bg-rose-100 text-rose-700",
  }[s] || "bg-gray-100 text-gray-700");

// Этапы (stages)
export const StageLabels = {
  intake: "1. Обращение клиента",
  collect: "2. Сбор груза и документов",
  loading: "3. Погрузка",
  cn_formalities: "4. Оформление Китай",
  in_transit: "5. В пути",
  kg_customs: "6. Растаможка Кыргызстан",
  payment: "7. Оплата",
  closed_stage: "8. Закрытие",
};

export const OrderedStages = [
  "intake",
  "collect",
  "loading",
  "cn_formalities",
  "in_transit",
  "kg_customs",
  "payment",
  "closed_stage",
];

// Связь статусов с этапами
export function stageOf(plStatus) {
  if (plStatus === "draft") return "intake";
  if (plStatus === "awaiting_docs") return "collect";
  if (["to_load", "loaded"].includes(plStatus)) return "loading";
  if (plStatus === "to_customs") return "cn_formalities";
  if (plStatus === "released") return "in_transit";
  if (plStatus === "kg_customs") return "kg_customs";
  if (plStatus === "delivered") return "payment";
  if (plStatus === "closed") return "closed_stage";
  return "in_transit";
}

export const StatusPipeline = [
  "draft",
  "awaiting_docs",
  "to_load",
  "loaded",
  "to_customs",
  "released",
  "kg_customs",
  "delivered",
  "closed",
];

export function nextStatusOf(currentStatus) {
  const i = StatusPipeline.indexOf(currentStatus);
  return i >= 0 ? StatusPipeline[i + 1] || null : null;
}

export function nextStageLabelOf(currentStatus) {
  const st = stageOf(currentStatus);
  const idx = OrderedStages.indexOf(st);
  const nextStageKey = OrderedStages[idx + 1] || null;
  return nextStageKey ? StageLabels[nextStageKey] : null;
}

// Константы для консолидаций
export const humanConsStatus = humanStatus;
export const badgeColorByConsStatus = badgeColorByStatus;

export function consNextStatusOf(currentStatus) {
  const i = StatusPipeline.indexOf(currentStatus);
  return i >= 0 ? StatusPipeline[i + 1] || null : null;
}

export const ConsStatusPipeline = ["loaded","to_customs","released","kg_customs","delivered","closed"];

export function humanConsStatus(s) {
  return ({
    loaded: "Погружено",
    to_customs: "Оформление Китай",
    released: "В пути",
    kg_customs: "Растаможка Кыргызстан",
    delivered: "Оплата",
    closed: "Закрыто",
  }[s] || s);
}

export function badgeColorByConsStatus(s) {
  return ({
    loaded: "bg-blue-200 text-blue-800",
    to_customs: "bg-purple-100 text-purple-700",
    released: "bg-emerald-100 text-emerald-700",
    kg_customs: "bg-violet-100 text-violet-700",
    delivered: "bg-teal-100 text-teal-700",
    closed: "bg-zinc-200 text-zinc-800",
  }[s] || "bg-gray-100 text-gray-700");
}

export function consNextStatusOf(currentStatus) {
  const i = ConsStatusPipeline.indexOf(currentStatus);
  return i >= 0 ? ConsStatusPipeline[i + 1] || null : null;
}