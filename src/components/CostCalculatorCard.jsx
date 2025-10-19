// src/components/CostCalculatorCard.jsx
// Калькулятор себестоимости и цены для клиента (вынесен из App.jsx)

import React, { useState, useMemo, useEffect } from "react";
import LabelInput from "/src/components/ui/LabelInput.jsx";
import KV from "./ui/KV.jsx";
import { updateClientPrice } from "/src/api/client.js"; // ⬅️ API вызов для сохранения цены

/* ============================
   Хук расчёта логистических ставок
============================ */
function useCostCalculator({ weight_kg, volume_cbm }) {
  const [rate1Kg, setRate1Kg] = useState(0.0);
  const [rate1Cbm, setRate1Cbm] = useState(0.0);
  const [rate2Kg, setRate2Kg] = useState(0.0);
  const [rate2Cbm, setRate2Cbm] = useState(0.0);
  const [customsFee, setCustomsFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);

  const density = useMemo(() => {
    const w = Number(weight_kg) || 0;
    const v = Number(volume_cbm) || 0;
    if (v <= 0) return null;
    return w / v;
  }, [weight_kg, volume_cbm]);

  const basisSuggestion = useMemo(() => {
    if (density == null) return null;
    return density > 250 ? "kg" : "cbm";
  }, [density]);

  const leg1 = useMemo(() => {
    const w = (Number(weight_kg) || 0) * (Number(rate1Kg) || 0);
    const v = (Number(volume_cbm) || 0) * (Number(rate1Cbm) || 0);
    if (basisSuggestion === "kg") return w;
    if (basisSuggestion === "cbm") return v;
    return Math.max(w, v);
  }, [weight_kg, volume_cbm, rate1Kg, rate1Cbm, basisSuggestion]);

  const leg2 = useMemo(() => {
    const w = (Number(weight_kg) || 0) * (Number(rate2Kg) || 0);
    const v = (Number(volume_cbm) || 0) * (Number(rate2Cbm) || 0);
    if (basisSuggestion === "kg") return w;
    if (basisSuggestion === "cbm") return v;
    return Math.max(w, v);
  }, [weight_kg, volume_cbm, rate2Kg, rate2Cbm, basisSuggestion]);

  const total = useMemo(() => {
    return (
      (Number(leg1) || 0) +
      (Number(leg2) || 0) +
      (Number(customsFee) || 0) +
      (Number(otherFee) || 0)
    );
  }, [leg1, leg2, customsFee, otherFee]);

  return {
    rate1Kg,
    setRate1Kg,
    rate1Cbm,
    setRate1Cbm,
    rate2Kg,
    setRate2Kg,
    rate2Cbm,
    setRate2Cbm,
    customsFee,
    setCustomsFee,
    otherFee,
    setOtherFee,
    density,
    basisSuggestion,
    leg1,
    leg2,
    total,
  };
}

/* ============================
   Основной компонент калькулятора
============================ */
export default function CostCalculatorCard({ pl, onSave }) {
  const calc = useCostCalculator({
    weight_kg: pl.weight_kg,
    volume_cbm: pl.volume_cbm,
  });

  const [clientPrice, setClientPrice] = useState(pl.quote?.client_price ?? "");
  const [saving, setSaving] = useState(false);
  const [savedStamp, setSavedStamp] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setClientPrice(pl.quote?.client_price ?? "");
  }, [pl.id, pl.quote?.client_price]);

  const calcCost = useMemo(
    () => Math.round((Number(calc.total || 0) + Number.EPSILON) * 100) / 100,
    [calc.total]
  );

  const cp = Number(clientPrice || 0);
  const profit = cp - calcCost;
  const marginPct =
    calcCost > 0
      ? Math.round(((profit / calcCost) * 100 + Number.EPSILON) * 10) / 10
      : 0;

  const perKg = pl.weight_kg > 0 ? cp / pl.weight_kg : null;
  const perCbm = pl.volume_cbm > 0 ? cp / pl.volume_cbm : null;
  const overKg = perKg != null && perKg > 0.7;
  const overCbm = perCbm != null && perCbm > 150;

  const hlKg =
    calc.basisSuggestion === "kg" ? "bg-emerald-50 border-emerald-300" : "";
  const hlCbm =
    calc.basisSuggestion === "cbm" ? "bg-emerald-50 border-emerald-300" : "";

  const badge = (text, good) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        good ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {text}
    </span>
  );

  // ⬇️ ТУТ ПРОИСХОДИТ ВЫЗОВ API ДЛЯ СОХРАНЕНИЯ ЦЕНЫ
  const handleSave = async () => {
    setErrorMsg("");
    setSaving(true);
    try {
      // сохраняем цену клиента на бэке (id или pl_number — что есть)
      const saved = await updateClientPrice(pl.id ?? pl.pl_number, Number(clientPrice || 0));

      // пробрасываем наверх сохранённые значения (если родитель что-то ещё пишет, напр. себестоимость)
      onSave?.(calcCost, Number(saved?.quote?.client_price ?? clientPrice));

      // фиксируем «сохранено»
      setSavedStamp(new Date().toISOString());
    } catch (e) {
      setErrorMsg(e?.message || "Не удалось сохранить цену");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Плотность */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-gray-600">
          Плотность:{" "}
          <b>
            {calc.density == null ? "—" : `${Math.round(calc.density)} кг/м³`}
          </b>
        </div>
        {calc.basisSuggestion === "kg" &&
          badge("Считать по весу (≥ 250 кг/м³)", false)}
        {calc.basisSuggestion === "cbm" &&
          badge("Считать по объёму (< 250 кг/м³)", true)}
      </div>

      {/* Плечо 1 */}
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-2">1. Ставка до границы (Китай)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabelInput
            type="number"
            label="$/кг"
            value={calc.rate1Kg}
            inputClass={`transition-colors ${hlKg}`}
            onChange={(v) => calc.setRate1Kg(parseFloat(v || 0))}
          />
          <LabelInput
            type="number"
            label="$/м³"
            value={calc.rate1Cbm}
            inputClass={`transition-colors ${hlCbm}`}
            onChange={(v) => calc.setRate1Cbm(parseFloat(v || 0))}
          />
          <div className="flex flex-col justify-end">
            <div className="text-xs text-gray-600">Стоимость плеча 1</div>
            <div className="text-base font-semibold">
              ${Math.round((calc.leg1 || 0) * 100) / 100}
            </div>
          </div>
        </div>
      </div>

      {/* Плечо 2 */}
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-2">2. Ставка с границы до Канта</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabelInput
            type="number"
            label="$/кг"
            value={calc.rate2Kg}
            inputClass={`transition-colors ${hlKg}`}
            onChange={(v) => calc.setRate2Kg(parseFloat(v || 0))}
          />
          <LabelInput
            type="number"
            label="$/м³"
            value={calc.rate2Cbm}
            inputClass={`transition-colors ${hlCbm}`}
            onChange={(v) => calc.setRate2Cbm(parseFloat(v || 0))}
          />
          <div className="flex flex-col justify-end">
            <div className="text-xs text-gray-600">Стоимость плеча 2</div>
            <div className="text-base font-semibold">
              ${Math.round((calc.leg2 || 0) * 100) / 100}
            </div>
          </div>
        </div>
      </div>

      {/* 3–4 + Себестоимость */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput
          type="number"
          label="3. Таможня, $"
          value={calc.customsFee}
          onChange={(v) => calc.setCustomsFee(parseFloat(v || 0))}
        />
        <LabelInput
          type="number"
          label="4. Прочие, $"
          value={calc.otherFee}
          onChange={(v) => calc.setOtherFee(parseFloat(v || 0))}
        />
        <div className="flex flex-col justify-end">
          <div className="text-xs text-gray-600">Себестоимость (1+2+3+4)</div>
          <div className="text-base font-semibold">${calcCost}</div>
        </div>
      </div>

      {/* Цена клиента + маржа */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <LabelInput
          className="sm:col-span-2"
          type="number"
          label="Цена для клиента, $"
          value={clientPrice}
          onChange={(v) => setClientPrice(v)}
        />
        <KV
          label="Прибыль"
          value={`${profit >= 0 ? "+" : ""}${Math.round(profit * 100) / 100} $`}
          good={profit >= 0}
        />
        <KV label="Маржа" value={`${marginPct}%`} good={marginPct >= 0} />
      </div>

      {(overKg || overCbm) && (
        <div className="text-xs rounded-lg p-3 border bg-amber-50 text-amber-800">
          {overKg && overCbm && (
            <div>
              Цена превышает среднюю ставку <b>$0.7/кг</b> и <b>$150/м³</b>.
            </div>
          )}
          {overKg && !overCbm && (
            <div>
              Цена превышает среднюю ставку по весу: <b>$0.7/кг</b>{" "}
              {perKg != null ? ` (у вас ${perKg.toFixed(3)} $/кг)` : ""}.
            </div>
          )}
          {overCbm && !overKg && (
            <div>
              Цена превышает среднюю ставку по объёму: <b>$150/м³</b>{" "}
              {perCbm != null ? ` (у вас ${perCbm.toFixed(2)} $/м³)` : ""}.
            </div>
          )}
        </div>
      )}

      {/* Сохранение */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          className="border rounded-lg px-3 py-3 text-sm min-h-[44px] disabled:opacity-60"
          disabled={saving}
          onClick={handleSave}
          title="Сохранить цену клиента на сервере"
        >
          {saving ? "⏳ Сохраняем..." : "💾 Сохранить расчёт"}
        </button>
        {errorMsg && (
          <span className="text-xs text-red-600">{errorMsg}</span>
        )}
        {!errorMsg && savedStamp && (
          <span className="text-xs text-gray-500">
            Сохранено • себестоимость ${calcCost}, клиенту ${clientPrice}
          </span>
        )}
      </div>
    </div>
  );
}