// src/components/consolidation/ConsolidationDetailsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Chip from "../ui/Chip.jsx";
import { X } from "lucide-react";
import { humanConsStatus, badgeColorByConsStatus, consNextStatusOf, humanStatus } from "../../constants/statuses.js";

export default function ConsolidationDetailsModal({
  cons,
  allPLs,
  consAll,
  onClose,
  onAdvance,
  onDissolve,
  onSavePLs, // (id:number, plIds:number[]) => Promise<void>
}) {
  const [pickedIds, setPickedIds] = useState(cons.pl_ids);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPickedIds(cons.pl_ids); }, [cons.id, cons.pl_ids]);

  const busyElsewhere = useMemo(() => {
    const s = new Set();
    (consAll || []).forEach(c => { if (c.id !== cons.id) (c.pl_ids || []).forEach(id => s.add(id)); });
    return s;
  }, [consAll, cons.id]);

  const candidates = useMemo(
    () => allPLs.filter(p =>
      ["to_load", "loaded"].includes(p.status) &&
      !pickedIds.includes(p.id) &&
      !busyElsewhere.has(p.id)
    ),
    [allPLs, pickedIds, busyElsewhere]
  );

  const sumW = pickedIds.reduce((a, id) => a + (allPLs.find(p => p.id === id)?.weight_kg || 0), 0);
  const sumV = pickedIds.reduce((a, id) => a + (allPLs.find(p => p.id === id)?.volume_cbm || 0), 0);
  const overW = cons.capacity_kg > 0 && sumW > cons.capacity_kg;
  const overV = cons.capacity_cbm > 0 && sumV > cons.capacity_cbm;
  const nextSt = consNextStatusOf(cons.status);

  async function save() {
    if (saving) return;
    try {
      setSaving(true);
      await onSavePLs?.(cons.id, pickedIds);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{cons.number}</h2>
              <Chip className={badgeColorByConsStatus(cons.status)}>{humanConsStatus(cons.status)}</Chip>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Вместимость: {cons.capacity_cbm || 0} м³ • {cons.capacity_kg || 0} кг
            </div>
          </div>
          <button className="p-2 rounded-lg border hover:bg-gray-50" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* В консолидации */}
          <div>
            <div className="text-sm font-medium mb-2">В консолидации</div>
            <div className="border rounded-xl divide-y max-h-[40vh] overflow-auto">
              {pickedIds.length === 0 && <div className="p-3 text-sm text-gray-500">Пусто</div>}
              {pickedIds.map(id => {
                const p = allPLs.find(x => x.id === id); if (!p) return null;
                return (
                  <div key={id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p.pl_number} — {typeof p.client === "string" ? p.client : p.client?.name || "—"}
                      </div>
                      <div className="text-xs text-gray-600">Вес: {p.weight_kg} кг • Объём: {p.volume_cbm} м³</div>
                    </div>
                    <button className="text-rose-600 text-xs underline" onClick={() => setPickedIds(prev => prev.filter(x => x !== id))}>
                      Исключить
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Кандидаты */}
          <div>
            <div className="text-sm font-medium mb-2">Доступные к добавлению</div>
            <div className="border rounded-xl divide-y max-h-[40vh] overflow-auto">
              {candidates.length === 0 && <div className="p-3 text-sm text-gray-500">Нет доступных PL</div>}
              {candidates.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {p.pl_number} — {typeof p.client === "string" ? p.client : p.client?.name || "—"}
                    </div>
                    <div className="text-xs text-gray-600">Вес: {p.weight_kg} кг • Объём: {p.volume_cbm} м³</div>
                  </div>
                  <button className="text-xs underline" onClick={() => setPickedIds(prev => [...prev, p.id])}>
                    Добавить
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <div className="text-sm">
            Итого: <b>{sumV.toFixed(2)} м³</b> • <b>{sumW.toFixed(2)} кг</b>
            {(overW || overV) && (
              <span className="text-rose-600 text-xs ml-2">
                {overV && "Превышение объёма. "} {overW && "Превышение веса."}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="border rounded-lg px-3 py-2 text-sm" onClick={save} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button className="border rounded-lg px-3 py-2 text-sm" onClick={() => onDissolve(cons)}>
              Расформировать
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm ${nextSt ? "bg-black text-white" : "bg-gray-200 text-gray-500"}`}
              disabled={!nextSt}
              onClick={() => onAdvance(cons)}
            >
              Перейти к следующему этапу{nextSt ? `: ${humanStatus(nextSt)}` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}