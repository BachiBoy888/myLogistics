// src/components/CostCalculatorCard.jsx
// Калькулятор себестоимости с поддержкой валют (KGS/USD/CNY)

import React, { useState, useMemo, useEffect } from "react";
import LabelInput from "/src/components/ui/LabelInput.jsx";
import KV from "./ui/KV.jsx";
import { updatePL, getFXRates } from "/src/api/client.js";

const CURRENCIES = [
  { code: "USD", name: "$ USD", flag: "🇺🇸" },
  { code: "KGS", name: "сом KGS", flag: "🇰🇬" },
  { code: "CNY", name: "¥ CNY", flag: "🇨🇳" },
];

// Форматирование числа как валюты
function formatMoney(num, decimals = 2) {
  const n = Number(num) || 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Конвертация в USD
function convertToUSD(amount, currency, rates) {
  if (!rates || currency === "USD") return Number(amount) || 0;
  const amt = Number(amount) || 0;
  if (currency === "KGS") return amt / rates.usdKgs;
  if (currency === "CNY") return (amt * rates.cnyKgs) / rates.usdKgs;
  return amt;
}

/* ============================
   Хук расчёта логистических ставок (новый - с суммами)
============================ */
function useCostCalculator({ weight_kg, volume_cbm, init = {}, fxRates }) {
  // Состояния для плечей (сумма + валюта) - используем пустую строку вместо 0 для input
  const [leg1Amount, setLeg1Amount] = useState(init.leg1Amount ?? init.rate1Amount ?? "");
  const [leg1Currency, setLeg1Currency] = useState(init.leg1Currency ?? "USD");
  const [leg2Amount, setLeg2Amount] = useState(init.leg2Amount ?? init.rate2Amount ?? "");
  const [leg2Currency, setLeg2Currency] = useState(init.leg2Currency ?? "USD");
  
  // Дополнительные сборы
  const [customsFee, setCustomsFee] = useState(init.customsFee ?? "");
  const [otherFee, setOtherFee] = useState(init.otherFee ?? "");
  
  // FX rates из сохранённого расчёта (для исторических данных)
  const [savedFxRates, setSavedFxRates] = useState(null);

  // Загружаем FX rates из сохранённого расчёта
  useEffect(() => {
    if (init.fxUsdKgs && init.fxCnyKgs) {
      setSavedFxRates({
        usdKgs: Number(init.fxUsdKgs),
        cnyKgs: Number(init.fxCnyKgs),
        date: init.fxDate,
        source: init.fxSource,
      });
    }
  }, [init.fxUsdKgs, init.fxCnyKgs, init.fxDate, init.fxSource]);

  // Определяем какие курсы использовать (сохранённые или текущие)
  const activeRates = savedFxRates || fxRates;

  // Пересчитываем суммы в USD
  const leg1AmountUSD = useMemo(() => {
    return convertToUSD(leg1Amount, leg1Currency, activeRates);
  }, [leg1Amount, leg1Currency, activeRates]);

  const leg2AmountUSD = useMemo(() => {
    return convertToUSD(leg2Amount, leg2Currency, activeRates);
  }, [leg2Amount, leg2Currency, activeRates]);

  // Плотность и базис расчёта
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

  // Расчёт $/кг и $/м³ (производные от суммы)
  const leg1UsdPerKg = useMemo(() => {
    const w = Number(weight_kg) || 0;
    if (w <= 0) return 0;
    return leg1AmountUSD / w;
  }, [leg1AmountUSD, weight_kg]);

  const leg1UsdPerM3 = useMemo(() => {
    const v = Number(volume_cbm) || 0;
    if (v <= 0) return 0;
    return leg1AmountUSD / v;
  }, [leg1AmountUSD, volume_cbm]);

  const leg2UsdPerKg = useMemo(() => {
    const w = Number(weight_kg) || 0;
    if (w <= 0) return 0;
    return leg2AmountUSD / w;
  }, [leg2AmountUSD, weight_kg]);

  const leg2UsdPerM3 = useMemo(() => {
    const v = Number(volume_cbm) || 0;
    if (v <= 0) return 0;
    return leg2AmountUSD / v;
  }, [leg2AmountUSD, volume_cbm]);

  // Расчёт стоимости плечей - всегда в USD
  const leg1 = leg1AmountUSD;
  const leg2 = leg2AmountUSD;

  const total = useMemo(() => {
    return (
      (Number(leg1) || 0) +
      (Number(leg2) || 0) +
      (Number(customsFee) || 0) +
      (Number(otherFee) || 0)
    );
  }, [leg1, leg2, customsFee, otherFee]);

  return {
    // Плечо 1
    leg1Amount,
    setLeg1Amount,
    leg1Currency,
    setLeg1Currency,
    leg1AmountUSD,
    leg1UsdPerKg,
    leg1UsdPerM3,
    // Плечо 2
    leg2Amount,
    setLeg2Amount,
    leg2Currency,
    setLeg2Currency,
    leg2AmountUSD,
    leg2UsdPerKg,
    leg2UsdPerM3,
    // Доп. сборы
    customsFee,
    setCustomsFee,
    otherFee,
    setOtherFee,
    // Расчёты
    density,
    basisSuggestion,
    leg1,
    leg2,
    total,
    // FX
    activeRates,
    isHistorical: !!savedFxRates,
  };
}

/* ============================
   Компонент выбора валюты
============================ */
function CurrencySelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="border rounded-lg px-2 py-2 text-sm bg-white"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}

/* ============================
   Основной компонент калькулятора
============================ */
export default function CostCalculatorCard({ pl, onSave }) {
  const [fxRates, setFxRates] = useState(null);
  const [fxLoading, setFxLoading] = useState(true);
  const [fxError, setFxError] = useState(null);

  // Загружаем текущие курсы
  useEffect(() => {
    async function loadRates() {
      try {
        setFxLoading(true);
        const rates = await getFXRates();
        setFxRates(rates);
        setFxError(null);
      } catch (err) {
        setFxError("Не удалось загрузить курсы валют");
        console.error("FX load error:", err);
      } finally {
        setFxLoading(false);
      }
    }
    loadRates();
  }, []);

  const calc = useCostCalculator({
    weight_kg: pl.weight_kg,
    volume_cbm: pl.volume_cbm,
    init: pl.calculator || {},
    fxRates,
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

  const badge = (text, good) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        good ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {text}
    </span>
  );

  // Сохранение
  const handleSave = async () => {
    setErrorMsg("");
    setSaving(true);
    try {
      const payload = {
        clientPrice: Number(clientPrice || 0),
        calculator: {
          // Новые поля для сумм плечей
          leg1Amount: Number(calc.leg1Amount || 0),
          leg1Currency: calc.leg1Currency,
          leg1AmountUSD: calc.leg1AmountUSD,
          leg1UsdPerKg: calc.leg1UsdPerKg,
          leg1UsdPerM3: calc.leg1UsdPerM3,
          leg2Amount: Number(calc.leg2Amount || 0),
          leg2Currency: calc.leg2Currency,
          leg2AmountUSD: calc.leg2AmountUSD,
          leg2UsdPerKg: calc.leg2UsdPerKg,
          leg2UsdPerM3: calc.leg2UsdPerM3,
          // Доп. сборы
          customsFee: Number(calc.customsFee || 0),
          otherFee: Number(calc.otherFee || 0),
          // Расчёты
          density: calc.density,
          basisSuggestion: calc.basisSuggestion,
          calcCost,
          // FX snapshot
          fxSource: calc.activeRates?.source || "NBKR",
          fxDate: calc.activeRates?.date,
          fxUsdKgs: calc.activeRates?.usdKgs,
          fxCnyKgs: calc.activeRates?.cnyKgs,
          fxSavedAt: new Date().toISOString(),
        },
        // Также сохраняем в отдельные поля для индексации
        leg1Amount: Number(calc.leg1Amount || 0),
        leg1Currency: calc.leg1Currency,
        leg1AmountUsd: calc.leg1AmountUSD,
        leg1UsdPerKg: calc.leg1UsdPerKg,
        leg1UsdPerM3: calc.leg1UsdPerM3,
        leg2Amount: Number(calc.leg2Amount || 0),
        leg2Currency: calc.leg2Currency,
        leg2AmountUsd: calc.leg2AmountUSD,
        leg2UsdPerKg: calc.leg2UsdPerKg,
        leg2UsdPerM3: calc.leg2UsdPerM3,
        fxSource: calc.activeRates?.source || "NBKR",
        fxDate: calc.activeRates?.date,
        fxUsdKgs: calc.activeRates?.usdKgs,
        fxCnyKgs: calc.activeRates?.cnyKgs,
        fxSavedAt: new Date().toISOString(),
      };

      const saved = await updatePL(pl.id, payload);

      const savedClientPrice =
        Number(saved?.quote?.client_price ?? payload.clientPrice);
      onSave?.(calcCost, savedClientPrice);

      setSavedStamp(new Date().toISOString());
    } catch (e) {
      setErrorMsg(e?.message || "Не удалось сохранить расчёт");
    } finally {
      setSaving(false);
    }
  };

  // Показываем USD эквивалент
  function showUSDEquiv(amount, currency) {
    if (currency === "USD" || !calc.activeRates) return null;
    const usd = convertToUSD(amount, currency, calc.activeRates);
    return `(≈ $${formatMoney(usd)})`;
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Курсы валют */}
      <div className="rounded-xl border p-3 bg-blue-50">
        <div className="font-medium mb-2 flex items-center justify-between">
          <span>Курсы валют НБКР</span>
          {calc.isHistorical && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
              Исторические курсы
            </span>
          )}
        </div>
        {fxLoading ? (
          <div className="text-gray-500">Загрузка курсов...</div>
        ) : fxError ? (
          <div className="text-red-600 text-xs">{fxError}</div>
        ) : calc.activeRates ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>1 USD = {formatMoney(calc.activeRates.usdKgs, 4)} KGS</div>
            <div>1 CNY = {formatMoney(calc.activeRates.cnyKgs, 4)} KGS</div>
            <div className="text-gray-500 col-span-2">
              Дата курса: {calc.activeRates.date || "—"}
              {calc.activeRates.cached && " (из кэша)"}
              {calc.activeRates.stale && " (устаревшие)"}
            </div>
          </div>
        ) : null}
      </div>

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
        
        {/* Сумма + валюта */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Сумма ставки</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              value={calc.leg1Amount}
              onChange={(e) => calc.setLeg1Amount(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Введите сумму"
            />
            <CurrencySelect
              value={calc.leg1Currency}
              onChange={calc.setLeg1Currency}
            />
          </div>
          {calc.leg1Currency !== "USD" && (
            <div className="text-xs text-gray-500 mt-1">
              {showUSDEquiv(calc.leg1Amount, calc.leg1Currency)}
            </div>
          )}
        </div>

        {/* Производные */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">$/кг</div>
            <div className="font-semibold">${formatMoney(calc.leg1UsdPerKg, 4)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">$/м³</div>
            <div className="font-semibold">${formatMoney(calc.leg1UsdPerM3, 2)}</div>
          </div>
        </div>

        {/* Итог плеча */}
        <div className="flex justify-end">
          <div>
            <div className="text-xs text-gray-600">Стоимость плеча 1</div>
            <div className="text-base font-semibold">${formatMoney(calc.leg1)}</div>
          </div>
        </div>
      </div>

      {/* Плечо 2 */}
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-2">2. Ставка с границы до Канта</div>
        
        {/* Сумма + валюта */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Сумма ставки</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              value={calc.leg2Amount}
              onChange={(e) => calc.setLeg2Amount(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Введите сумму"
            />
            <CurrencySelect
              value={calc.leg2Currency}
              onChange={calc.setLeg2Currency}
            />
          </div>
          {calc.leg2Currency !== "USD" && (
            <div className="text-xs text-gray-500 mt-1">
              {showUSDEquiv(calc.leg2Amount, calc.leg2Currency)}
            </div>
          )}
        </div>

        {/* Производные */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">$/кг</div>
            <div className="font-semibold">${formatMoney(calc.leg2UsdPerKg, 4)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">$/м³</div>
            <div className="font-semibold">${formatMoney(calc.leg2UsdPerM3, 2)}</div>
          </div>
        </div>

        {/* Итог плеча */}
        <div className="flex justify-end">
          <div>
            <div className="text-xs text-gray-600">Стоимость плеча 2</div>
            <div className="text-base font-semibold">${formatMoney(calc.leg2)}</div>
          </div>
        </div>
      </div>

      {/* 3–4 + Себестоимость */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput
          type="number"
          label="3. Таможня, $"
          value={calc.customsFee}
          onChange={(v) => calc.setCustomsFee(v)}
        />
        <LabelInput
          type="number"
          label="4. Прочие, $"
          value={calc.otherFee}
          onChange={(v) => calc.setOtherFee(v)}
        />
        <div className="flex flex-col justify-end">
          <div className="text-xs text-gray-600">Себестоимость (1+2+3+4)</div>
          <div className="text-base font-semibold text-orange-500">
            ${formatMoney(calcCost)}
          </div>
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
          value={`${profit >= 0 ? "+" : ""}${formatMoney(profit)} $`}
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
              Цена превышает среднюю ставку по весу: <b>$0.7/кг</b>
              {perKg != null ? ` (у вас ${perKg.toFixed(3)} $/кг)` : ""}.
            </div>
          )}
          {overCbm && !overKg && (
            <div>
              Цена превышает среднюю ставку по объёму: <b>$150/м³</b>
              {perCbm != null ? ` (у вас ${perCbm.toFixed(2)} $/м³)` : ""}.
            </div>
          )}
        </div>
      )}

      {/* Сохранение */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          className="border rounded-lg px-3 py-3 text-sm min-h-[44px] disabled:opacity-60 bg-black text-white"
          disabled={saving || fxLoading}
          onClick={handleSave}
          title="Сохранить цену клиента и калькулятор на сервере"
        >
          {saving ? "⏳ Сохраняем..." : "💾 Сохранить расчёт"}
        </button>
        {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
        {!errorMsg && savedStamp && (
          <span className="text-xs text-gray-500">
            Сохранено • себестоимость ${calcCost}, клиенту ${clientPrice}
          </span>
        )}
      </div>
    </div>
  );
}
