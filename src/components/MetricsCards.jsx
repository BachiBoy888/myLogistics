// src/components/MetricsCards.jsx
// Display metrics in card format

import React from "react";

function MetricCard({ title, metrics, labels }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-medium text-gray-900">
              {key === "spend" || key === "cpc" 
                ? `$${metrics?.[key] ?? 0}` 
                : metrics?.[key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MetricsCards({ metrics, period = "today" }) {
  const periodLabels = {
    today: "Сегодня",
    week: "Неделя",
    month: "Месяц",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Метрики ({periodLabels[period] || period})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Входящие"
          metrics={metrics?.inbound}
          labels={{
            leads: "Лиды",
            orders: "Заказы",
            requests: "Запросы",
          }}
        />

        <MetricCard
          title="Исходящие"
          metrics={metrics?.outbound}
          labels={{
            calls: "Звонки",
            offers: "Коммерческие предложения",
            conversions: "Конверсии",
          }}
        />

        <MetricCard
          title="Реклама"
          metrics={metrics?.ads}
          labels={{
            spend: "Расход",
            clicks: "Клики",
            leads: "Лиды",
          }}
        />
      </div>

      {/* North Star Metrics Preview */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">North Star Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded p-3 border">
            <div className="text-xs text-gray-500 mb-1">Profit per Order</div>
            <div className="text-xl font-bold text-green-600">
              ${metrics?.profit?.perOrder ?? 0}
            </div>
          </div>
          <div className="bg-white rounded p-3 border">
            <div className="text-xs text-gray-500 mb-1">Effort per Order</div>
            <div className="text-xl font-bold text-blue-600">
              {metrics?.effort?.perOrder ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
