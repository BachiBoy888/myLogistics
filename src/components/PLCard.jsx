// src/components/PLCard.jsx
// Карточка PL — версия 2025-10-17
// - вынос калькулятора в отдельный файл
// - сохранение цены клиента в БД
// - подтягивание сохранённой цены при загрузке

import React, { useState, useMemo } from "react";
import CostCalculatorCard from "./CostCalculatorCard.jsx";
import {
  Package,
  X,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  ClipboardCopy,
  ChevronRight,
} from "lucide-react";

export default function PLCard({
  pl,
  onUpdate,
  onClose,
  onNext,
  onDelete,
  warehouses = [],
  cons = [],
  ui,
  helpers,
  parts,
}) {
  const { Chip, ProgressBar, Card, LabelInput } = ui;
  const { DocsList, CommentsCard } = parts ?? {};
  const {
    readinessForPL,
    canAllowToShip,
    requirementsResult,
    nextStatusOf,
    nextStageLabelOf,
    humanStatus,
    badgeColorByStatus,
  } = helpers;

  const [showMenu, setShowMenu] = useState(false);
  const [copiedCargo, setCopiedCargo] = useState(false);

  // консолидация, куда входит PL
  const consOfPL = useMemo(
    () => (cons || []).find((c) => c.pl_ids?.includes(pl.id)) || null,
    [cons, pl.id]
  );

  const { ok: canGoNext, need } = requirementsResult(pl);
  const nextStatus = nextStatusOf(pl.status);
  const nextLabel = nextStageLabelOf(pl.status);
  const readiness = readinessForPL(pl);

  // копирование краткой инфы
  const copyCargoInfo = () => {
    const text = [
      `${pl.pl_number ?? ""}`,
      `Load: ${pl.title ?? ""}`,
      `Volume, м³: ${pl.volume_cbm ?? ""}`,
      `Weight, kg: ${pl.weight_kg ?? ""}`,
      `Sender: ${pl.shipper_name ?? ""}`,
      `Sender address: ${pl.pickup_address ?? ""}`,
      `Contact info: ${pl.shipper_contacts ?? ""}`,
    ].join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedCargo(true);
        setTimeout(() => setCopiedCargo(false), 1800);
      })
      .catch((e) => console.error("Не удалось скопировать", e));
  };

  // ✅ обработчик сохранения цены
  async function handleSaveQuote(calcCost, clientPrice) {
    try {
      // обновляем данные PL в БД
      await onUpdate({
        quote: {
          calc_cost: Number(calcCost) || 0,
          client_price: Number(clientPrice) || 0,
        },
      });
    } catch (err) {
      console.error("Ошибка при сохранении цены:", err);
      alert("Не удалось сохранить стоимость");
    }
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* === Заголовок === */}
      <div className="p-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h2 className="font-semibold text-lg">
              {pl.pl_number || "Черновик"}
            </h2>
            <Chip className={badgeColorByStatus(pl.status)}>
              {humanStatus(pl.status)}
            </Chip>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {(pl.client && pl.client.name) || pl.client || "—"} •{" "}
            {pl.title || "Без названия"}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="p-2 border rounded-lg hover:bg-gray-50"
              onClick={() => setShowMenu((v) => !v)}
              title="Меню действий"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 w-44">
                <button
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-sm text-rose-600 hover:bg-rose-50 rounded-lg"
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm("Удалить этот PL безвозвратно?")) onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить PL
                </button>
              </div>
            )}
          </div>

          <button
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Закрыть карточку"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* === В консолидации === */}
      {consOfPL && (
        <div className="px-4 py-2 bg-violet-50 border-b text-sm">
          В консолидации: <b>{consOfPL.number}</b>
        </div>
      )}

      {/* === Груз === */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Груз" className="bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <LabelInput
              label="Название"
              value={pl.title ?? ""}
              onChange={(v) => onUpdate({ title: v })}
            />
            <LabelInput
              type="number"
              label="Вес, кг"
              value={pl.weight_kg ?? ""}
              onChange={(v) => onUpdate({ weight_kg: parseFloat(v || 0) })}
            />
            <LabelInput
              type="number"
              label="Объём, м³"
              value={pl.volume_cbm ?? ""}
              onChange={(v) => onUpdate({ volume_cbm: parseFloat(v || 0) })}
            />
            <LabelInput
              type="number"
              label="Мест, шт"
              value={pl.places_qty ?? ""}
              onChange={(v) => onUpdate({ places_qty: parseInt(v || 0) })}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={copyCargoInfo}
              className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-sm"
            >
              <ClipboardCopy className="w-4 h-4" />
              Скопировать
            </button>
            {copiedCargo && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Скопировано
              </span>
            )}
          </div>
        </Card>

        <Card title="Забор / Отправитель" className="bg-gray-50">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <LabelInput
              label="Адрес забора"
              value={pl.pickup_address ?? ""}
              onChange={(v) => onUpdate({ pickup_address: v })}
            />
            <LabelInput
              label="Отправитель"
              value={pl.shipper_name ?? ""}
              onChange={(v) => onUpdate({ shipper_name: v })}
            />
            <LabelInput
              label="Контакты"
              value={pl.shipper_contacts ?? ""}
              onChange={(v) => onUpdate({ shipper_contacts: v })}
            />
          </div>
        </Card>
      </div>

      {/* === Калькулятор → Документы → Комментарии === */}
      <div className="p-4 bg-gray-200 space-y-5">
        {/* ✅ калькулятор вынесен в отдельный файл */}
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
          <h3 className="font-semibold mb-3">Калькулятор себестоимости</h3>
          <CostCalculatorCard pl={pl} onSave={handleSaveQuote} />
        </div>

        {DocsList && (
          <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
            <h3 className="font-semibold mb-3">Документы</h3>
            <DocsList pl={pl} onUpdate={onUpdate} />
          </div>
        )}

        {CommentsCard && (
          <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
            <h3 className="font-semibold mb-3">Комментарии</h3>
            <CommentsCard
              pl={pl}
              onAdd={(c) =>
                onUpdate({ comments: [...(pl.comments || []), c] })
              }
            />
          </div>
        )}
      </div>

      {/* === Действия === */}
      <div className="p-4 border-t flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          Готовность документов:
          <div className="w-40">
            <ProgressBar value={readiness} />
          </div>
          <span>{readiness}%</span>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <button
            onClick={() => {
              if (!canGoNext || !nextStatus) return;
              onNext(nextStatus);
            }}
            disabled={!canGoNext || !nextStatus}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm min-h-[44px] ${
              canGoNext && nextStatus
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            Перейти к следующему этапу
            {nextLabel ? `: ${nextLabel}` : ""}
          </button>

          {!canGoNext && need && (
            <div className="text-xs text-rose-600 max-w-xl">{need}</div>
          )}
        </div>
      </div>
    </div>
  );
}