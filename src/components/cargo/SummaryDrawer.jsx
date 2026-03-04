// src/components/cargo/SummaryDrawer.jsx
// Выдвижная панель сводки (drawer) с агрегатами

import React from "react";
import { StageLabels, OrderedStages, stageOf, badgeColorByStatus } from "../../constants/statuses.js";
import { X } from "lucide-react";

export default function SummaryDrawer({ open, onClose, stats }) {
  if (!open) return null;

  const { total, activeCount, closedCount, avgProgress, stageBreakdown } = stats;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 text-white z-50 shadow-2xl overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Сводка</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Total */}
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-1">Всего грузов</div>
            <div className="text-4xl font-bold">{total}</div>
          </div>

          {/* Avg Progress */}
          <div className="mb-6 bg-gray-800 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">Средний прогресс</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
              <div className="text-lg font-bold">{avgProgress}%</div>
            </div>
          </div>

          {/* Active / Closed */}
          <div className="mb-6 bg-gray-800 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">Активность</div>
            <div className="flex items-center justify-between mb-2">
              <span>Активные: {activeCount}</span>
              <span>Закрытые: {closedCount}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(activeCount / total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Stage Breakdown */}
          <div>
            <div className="text-sm text-gray-400 mb-3">По этапам</div>
            <div className="space-y-2">
              {stageBreakdown.map(({ stage, label, count, color }) => (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <div className="flex-1 text-sm">{label}</div>
                  <div className="font-medium">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
