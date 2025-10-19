// src/constants/docs.js
// Единый список типов документов, их названия и подсказки (UI)

export const DOC_TYPES = [
  {
    type: "invoice",
    title: "Инвойс",
    hint: "Загрузите инвойс с переводом на русский.",
    filePrefix: "invoice",
  },
  {
    type: "packing_list",
    title: "Упаковочный лист",
    hint: "Загрузите упаковочный лист (PL).",
    filePrefix: "pl",
  },
  {
    type: "inspection",
    title: "Осмотр",
    hint: "Отчёт осмотра груза / фотофиксация.",
    filePrefix: "inspection",
  },
  {
    type: "pre_declaration",
    title: "Предварительное информирование",
    hint: "Файл ПИ для оформления в Китае.",
    filePrefix: "predecl",
  },
];