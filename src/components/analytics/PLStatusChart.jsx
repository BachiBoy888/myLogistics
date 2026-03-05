// src/components/analytics/PLStatusChart.jsx
// График динамики PL по статусам с интерактивной легендой

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  draft: "#9CA3AF",           // gray - Обращение
  awaiting_docs: "#EAB308",   // yellow - Сбор информации
  awaiting_load: "#F97316",   // orange
  to_load: "#3B82F6",         // blue - Погрузка
  loaded: "#60A5FA",          // light blue
  to_customs: "#A855F7",      // purple - Оформление Китай
  released: "#22C55E",        // green - В пути
  kg_customs: "#EC4899",      // pink - Растаможка
  collect_payment: "#14B8A6", // teal - Оплата
  delivered: "#10B981",       // emerald
  closed: "#6B7280",          // gray - Закрыто
};

const STATUS_LABELS = {
  draft: "Обращение",
  awaiting_docs: "Сбор информации",
  awaiting_load: "Сбор груза",
  to_load: "Погрузка",
  loaded: "Погружено",
  to_customs: "Оформление Китай",
  released: "В пути",
  kg_customs: "Растаможка",
  collect_payment: "Оплата",
  delivered: "Доставлено",
  closed: "Закрыто",
};

export default function PLStatusChart({ data, granularity }) {
  const [hiddenStatuses, setHiddenStatuses] = useState(new Set());

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-100">Динамика PL по статусам</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Нет данных за выбранный период
        </div>
      </div>
    );
  }

  // Get all unique statuses from data
  const allStatuses = Object.keys(STATUS_COLORS).filter(
    status => data.some(d => d[status] !== undefined)
  );

  const toggleStatus = (status) => {
    setHiddenStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const formatXAxis = (value) => {
    const date = new Date(value);
    if (granularity === "month") {
      return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
    } else if (granularity === "week") {
      return `Нед ${date.getWeek()}`;
    } else {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
      return (
        <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs">
          <div className="font-medium text-gray-800 mb-2">{date}</div>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span style={{ color: entry.color }}>{STATUS_LABELS[entry.dataKey] || entry.dataKey}:</span>
                </div>
                <span className="font-medium text-gray-800">{entry.value || 0}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Legend with clickable items
  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        <p className="w-full text-sm text-gray-400 mb-2">
          Нажмите на статус в легенде, чтобы скрыть/показать кривую
        </p>
        {allStatuses.map((status) => {
          const isHidden = hiddenStatuses.has(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                isHidden
                  ? "bg-gray-700 text-gray-500 opacity-50"
                  : "bg-gray-700/50 text-gray-200 hover:bg-gray-700"
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: isHidden ? "#6B7280" : STATUS_COLORS[status],
                }}
              />
              <span>{STATUS_LABELS[status] || status}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-100">Динамика PL по статусам</h3>
      </div>

      {/* Custom Legend */}
      <CustomLegend />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {allStatuses.map((status) => (
              !hiddenStatuses.has(status) && (
                <Line
                  key={status}
                  type="monotone"
                  dataKey={status}
                  name={STATUS_LABELS[status]}
                  stroke={STATUS_COLORS[status]}
                  strokeWidth={2}
                  dot={{ fill: STATUS_COLORS[status], strokeWidth: 0, r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};
