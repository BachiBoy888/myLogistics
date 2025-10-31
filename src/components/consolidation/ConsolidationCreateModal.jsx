// src/components/consolidation/ConsolidationCreateModal.jsx
import React, { useMemo, useState } from "react";
import Label from "../ui/Label.jsx";
import LabelInput from "../ui/LabelInput.jsx";
import { X } from "lucide-react";

export default function ConsolidationCreateModal({ onClose, plsCandidate = [], onCreate }) {
  const [capacityCbm, setCapacityCbm] = useState(0);
  const [capacityKg, setCapacityKg] = useState(0);
  const [pickedIds, setPickedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const sumW = useMemo(
    () => pickedIds.reduce((a, id) => a + (plsCandidate.find(p => p.id === id)?.weight_kg || 0), 0),
    [pickedIds, plsCandidate]
  );
  const sumV = useMemo(
    () => pickedIds.reduce((a, id) => a + (plsCandidate.find(p => p.id === id)?.volume_cbm || 0), 0),
    [pickedIds, plsCandidate]
  );

  const overW = capacityKg > 0 && sumW > capacityKg;
  const overV = capacityCbm > 0 && sumV > capacityCbm;

  function toggle(id) {
    setPickedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!pickedIds.length || saving) return;
    try {
      setSaving(true);
      await onCreate({
        capacity_cbm: Number(capacityCbm) || 0,
        capacity_kg: Number(capacityKg) || 0,
        pl_ids: pickedIds,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Создать консолидацию</h2>
          <button className="p-2 rounded-lg border hover:bg-gray-50" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <Label>Вместимость транспорта</Label>
            <LabelInput type="number" label="Объём, м³" value={capacityCbm} onChange={setCapacityCbm} />
            <LabelInput type="number" label="Грузоподъёмность, кг" value={capacityKg} onChange={setCapacityKg} />
            <div className="text-sm">
              <div>Итого выбрано: <b>{sumV.toFixed(2)} м³</b> • <b>{sumW.toFixed(2)} кг</b></div>
              {(overW || overV) && (
                <div className="text-rose-600 text-xs mt-1">
                  {overV && "Превышение по объёму. "} {overW && "Превышение по весу."}
                </div>
              )}
            </div>
            <button
              className="w-full bg-black text-white rounded-lg px-3 py-3 text-sm disabled:opacity-50"
              disabled={!pickedIds.length || saving}
              onClick={submit}
            >
              {saving ? "Сохранение…" : "Сохранить консолидацию"}
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="text-sm font-medium mb-2">Доступные PL (Погрузка)</div>
            <div className="border rounded-xl divide-y max-h-[50vh] overflow-auto">
              {plsCandidate.length === 0 && (
                <div className="p-3 text-sm text-gray-500">Нет доступных PL</div>
              )}
              {plsCandidate.map(p => (
                <label key={p.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {p.pl_number} — {typeof p.client === "string" ? p.client : p.client?.name || "—"}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{p.title}</div>
                    <div className="text-xs text-gray-600">Вес: {p.weight_kg} кг • Объём: {p.volume_cbm} м³</div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={pickedIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}