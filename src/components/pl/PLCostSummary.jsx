// src/components/pl/PLCostSummary.jsx
// Упрощённый калькулятор для PL с горизонтальным layout

import React, { useState, useMemo, useEffect } from "react";
import { updatePL } from "../../api/client.js";

function formatMoney(num, decimals = 2) {
  const n = Number(num) || 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function PLCostSummary({ pl, onUpdate }) {
  // Client price state
  const [clientPrice, setClientPrice] = useState(() => {
    const cp = pl.quote?.client_price || pl.client_price || 0;
    return cp !== 0 ? String(cp) : "";
  });
  
  // Leg 1 editable state
  const [leg1Input, setLeg1Input] = useState(() => {
    const val = pl.leg1_amount || pl.leg1Amount || pl.calculator?.leg1Amount || 0;
    return val !== 0 ? String(val) : "";
  });
  const [leg1Currency, setLeg1Currency] = useState(pl.leg1_currency || pl.leg1Currency || "USD");
  
  // Leg 2 editable state
  const [leg2Input, setLeg2Input] = useState(() => {
    const val = pl.leg2_amount || pl.leg2Amount || pl.calculator?.leg2Amount || 0;
    return val !== 0 ? String(val) : "";
  });
  const [leg2Currency, setLeg2Currency] = useState(pl.leg2_currency || pl.leg2Currency || "USD");
  
  const [saving, setSaving] = useState(false);
  const [savedStamp, setSavedStamp] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Update when pl changes
  useEffect(() => {
    const cp = pl.quote?.client_price || pl.client_price || 0;
    setClientPrice(cp !== 0 ? String(cp) : "");
    
    const leg1Val = pl.leg1_amount || pl.leg1Amount || pl.calculator?.leg1Amount || 0;
    setLeg1Input(leg1Val !== 0 ? String(leg1Val) : "");
    setLeg1Currency(pl.leg1_currency || pl.leg1Currency || "USD");
    
    const leg2Val = pl.leg2_amount || pl.leg2Amount || pl.calculator?.leg2Amount || 0;
    setLeg2Input(leg2Val !== 0 ? String(leg2Val) : "");
    setLeg2Currency(pl.leg2_currency || pl.leg2Currency || "USD");
  }, [pl.id]);

  // Calculate USD values
  const leg1Val = Number(leg1Input) || 0;
  const leg2Val = Number(leg2Input) || 0;
  
  // For now assume USD or already converted - in real app would use FX rates
  const leg1AmountUsd = leg1Currency === 'USD' ? leg1Val : leg1Val;
  const leg2AmountUsd = leg2Currency === 'USD' ? leg2Val : leg2Val;

  // Calculate totals
  const costPrice = leg1AmountUsd + leg2AmountUsd;
  const cp = Number(clientPrice) || 0;
  const profit = cp - costPrice;
  const marginPct = cp > 0 ? (profit / cp) * 100 : 0;

  const handleSave = async () => {
    setErrorMsg("");
    setSaving(true);
    try {
      await updatePL(pl.id, {
        clientPrice: Number(clientPrice) || 0,
        // Leg 1
        leg1Amount: leg1Val,
        leg1Currency: leg1Currency,
        leg1AmountUsd: leg1AmountUsd,
        leg1UsdPerKg: pl.weight_kg > 0 ? leg1AmountUsd / pl.weight_kg : 0,
        leg1UsdPerM3: pl.volume_cbm > 0 ? leg1AmountUsd / pl.volume_cbm : 0,
        // Leg 2
        leg2Amount: leg2Val,
        leg2Currency: leg2Currency,
        leg2AmountUsd: leg2AmountUsd,
        leg2UsdPerKg: pl.weight_kg > 0 ? leg2AmountUsd / pl.weight_kg : 0,
        leg2UsdPerM3: pl.volume_cbm > 0 ? leg2AmountUsd / pl.volume_cbm : 0,
      });
      
      onUpdate?.({ 
        client_price: Number(clientPrice) || 0,
        leg1_amount: leg1Val,
        leg1_currency: leg1Currency,
        leg1_amount_usd: leg1AmountUsd,
        leg2_amount: leg2Val,
        leg2_currency: leg2Currency,
        leg2_amount_usd: leg2AmountUsd,
      });
      
      setSavedStamp(new Date().toISOString());
      setTimeout(() => setSavedStamp(null), 2000);
    } catch (e) {
      setErrorMsg(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const getProfitColor = () => {
    if (profit > 0) return "text-green-600";
    if (profit < 0) return "text-red-600";
    return "text-yellow-600";
  };

  const getMarginColor = () => {
    if (marginPct > 20) return "text-green-600";
    if (marginPct < 0) return "text-red-600";
    return "text-yellow-600";
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Legs Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Leg 1 - Editable */}
        <div className="rounded-xl border-2 border-blue-200 p-3 bg-blue-50/50">
          <div className="font-medium mb-2 text-blue-900">1. Ставка до границы (Китай)</div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Стоимость плеча</div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                inputMode="decimal"
                value={leg1Input}
                onChange={(e) => setLeg1Input(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-lg font-semibold"
                placeholder="0.00"
              />
              <select
                value={leg1Currency}
                onChange={(e) => setLeg1Currency(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
                <option value="KGS">KGS</option>
              </select>
            </div>
            {leg1AmountUsd > 0 && leg1Currency !== 'USD' && (
              <div className="text-xs text-gray-500">
                ≈ ${formatMoney(leg1AmountUsd)} USD
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/кг</div>
              <div className="font-medium">${formatMoney(pl.weight_kg > 0 ? leg1AmountUsd / pl.weight_kg : 0, 4)}</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/м³</div>
              <div className="font-medium">${formatMoney(pl.volume_cbm > 0 ? leg1AmountUsd / pl.volume_cbm : 0, 2)}</div>
            </div>
          </div>
        </div>

        {/* Leg 2 - Editable */}
        <div className="rounded-xl border-2 border-emerald-200 p-3 bg-emerald-50/50">
          <div className="font-medium mb-2 text-emerald-900">2. Ставка с границы до Канта</div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Стоимость плеча</div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                inputMode="decimal"
                value={leg2Input}
                onChange={(e) => setLeg2Input(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-lg font-semibold"
                placeholder="0.00"
              />
              <select
                value={leg2Currency}
                onChange={(e) => setLeg2Currency(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
                <option value="KGS">KGS</option>
              </select>
            </div>
            {leg2AmountUsd > 0 && leg2Currency !== 'USD' && (
              <div className="text-xs text-gray-500">
                ≈ ${formatMoney(leg2AmountUsd)} USD
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/кг</div>
              <div className="font-medium">${formatMoney(pl.weight_kg > 0 ? leg2AmountUsd / pl.weight_kg : 0, 4)}</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/м³</div>
              <div className="font-medium">${formatMoney(pl.volume_cbm > 0 ? leg2AmountUsd / pl.volume_cbm : 0, 2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Price */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Себестоимость груза</div>
            <div className="text-xs text-gray-500">1 плечо + 2 плечо</div>
          </div>
          <div className="text-2xl font-bold text-orange-600">${formatMoney(costPrice)}</div>
        </div>
      </div>

      {/* Client Price */}
      <div className="border rounded-lg p-4">
        <label className="block text-sm text-gray-600 mb-2">Цена для клиента</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={clientPrice}
              onChange={(e) => setClientPrice(e.target.value)}
              className="w-full border rounded-lg pl-7 pr-3 py-2"
              placeholder="0.00"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? "..." : "Сохранить"}
          </button>
        </div>
        {errorMsg && <div className="text-xs text-red-600 mt-1">{errorMsg}</div>}
        {savedStamp && !errorMsg && (
          <div className="text-xs text-green-600 mt-1">Сохранено</div>
        )}
      </div>

      {/* Profit & Margin */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Прибыль</div>
          <div className={`text-xl font-bold ${getProfitColor()}`}>
            {profit >= 0 ? '+' : ''}${formatMoney(profit)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Маржа</div>
          <div className={`text-xl font-bold ${getMarginColor()}`}>
            {formatMoney(marginPct, 1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
