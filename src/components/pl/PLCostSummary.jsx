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
  const [saving, setSaving] = useState(false);
  const [savedStamp, setSavedStamp] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Update when pl changes
  useEffect(() => {
    const cp = pl.quote?.client_price || pl.client_price || 0;
    setClientPrice(cp !== 0 ? String(cp) : "");
  }, [pl.id]);

  // Get leg costs from PL
  const leg1Amount = Number(pl.leg1_amount_usd || pl.leg1AmountUsd || pl.calculator?.leg1AmountUSD || 0);
  const leg2Amount = Number(pl.leg2_amount_usd || pl.leg2AmountUsd || pl.calculator?.leg2AmountUSD || 0);

  // Calculate totals
  const costPrice = leg1Amount + leg2Amount;
  const cp = Number(clientPrice) || 0;
  const profit = cp - costPrice;
  const marginPct = cp > 0 ? (profit / cp) * 100 : 0;

  const handleSave = async () => {
    setErrorMsg("");
    setSaving(true);
    try {
      await updatePL(pl.id, {
        clientPrice: Number(clientPrice) || 0,
      });
      onUpdate?.({ client_price: Number(clientPrice) || 0 });
      setSavedStamp(new Date().toISOString());
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
        {/* Leg 1 */}
        <div className="rounded-xl border-2 border-blue-200 p-3 bg-blue-50/50">
          <div className="font-medium mb-2 text-blue-900">1. Ставка до границы (Китай)</div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Стоимость плеча</div>
            <div className="text-xl font-semibold">${formatMoney(leg1Amount)}</div>
            {(pl.leg1_currency || pl.leg1Currency) !== 'USD' && (pl.leg1_amount || pl.leg1Amount) > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {formatMoney(pl.leg1_amount || pl.leg1Amount)} {pl.leg1_currency || pl.leg1Currency}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/кг</div>
              <div className="font-medium">${formatMoney(pl.weight_kg > 0 ? leg1Amount / pl.weight_kg : 0, 4)}</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/м³</div>
              <div className="font-medium">${formatMoney(pl.volume_cbm > 0 ? leg1Amount / pl.volume_cbm : 0, 2)}</div>
            </div>
          </div>
        </div>

        {/* Leg 2 */}
        <div className="rounded-xl border-2 border-emerald-200 p-3 bg-emerald-50/50">
          <div className="font-medium mb-2 text-emerald-900">2. Ставка с границы до Канта</div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Стоимость плеча</div>
            <div className="text-xl font-semibold">${formatMoney(leg2Amount)}</div>
            {(pl.leg2_currency || pl.leg2Currency) !== 'USD' && (pl.leg2_amount || pl.leg2Amount) > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {formatMoney(pl.leg2_amount || pl.leg2Amount)} {pl.leg2_currency || pl.leg2Currency}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/кг</div>
              <div className="font-medium">${formatMoney(pl.weight_kg > 0 ? leg2Amount / pl.weight_kg : 0, 4)}</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-500">$/м³</div>
              <div className="font-medium">${formatMoney(pl.volume_cbm > 0 ? leg2Amount / pl.volume_cbm : 0, 2)}</div>
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
              type="number"
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
