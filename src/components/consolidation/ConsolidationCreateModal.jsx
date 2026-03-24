// src/components/consolidation/ConsolidationCreateModal.jsx
import React, { useMemo, useState } from "react";
import Label from "../ui/Label.jsx";
import LabelInput from "../ui/LabelInput.jsx";
import { X, User, Phone, Truck } from "lucide-react";

export default function ConsolidationCreateModal({ onClose, plsCandidate = [], onCreate }) {
  const [capacityCbm, setCapacityCbm] = useState(0);
  const [capacityKg, setCapacityKg] = useState(0);
  const [plannedArrivalDate, setPlannedArrivalDate] = useState("");
  const [title, setTitle] = useState("");
  const [pickedIds, setPickedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Driver fields - support creating with initial driver
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicle, setDriverVehicle] = useState("");

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
      // Build drivers array if any driver data provided
      const drivers = [];
      if (driverName.trim()) {
        drivers.push({
          name: driverName.trim(),
          phone: driverPhone.trim(),
          vehicleNumber: driverVehicle.trim(),
        });
      }
      await onCreate({
        title: title.trim() || null,
        capacity_cbm: Number(capacityCbm) || 0,
        capacity_kg: Number(capacityKg) || 0,
        planned_arrival_date: plannedArrivalDate || null,
        pl_ids: pickedIds,
        drivers: drivers.length > 0 ? drivers : undefined,
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
          <h2 className="text-lg font-semibold">Создать транспорт</h2>
          <button className="p-2 rounded-lg border hover:bg-gray-50" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <Label>Обозначение транспорта</Label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="CONS-123"
            />

            <Label>Вместимость транспорта</Label>
            <LabelInput type="number" label="Объём, м³" value={capacityCbm} onChange={setCapacityCbm} />
            <LabelInput type="number" label="Грузоподъёмность, кг" value={capacityKg} onChange={setCapacityKg} />

            {/* Driver Section */}
            <div className="pt-2 border-t border-gray-200">
              <Label>Водитель</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Имя водителя"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Телефон"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={driverVehicle}
                    onChange={(e) => setDriverVehicle(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Номер машины"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Плановая дата прибытия в Бишкек</label>
              <input
                type="date"
                value={plannedArrivalDate}
                onChange={(e) => setPlannedArrivalDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
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
              {saving ? "Сохранение…" : "Сохранить транспорт"}
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