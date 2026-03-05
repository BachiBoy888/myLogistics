// src/components/analytics/WeightDynamicsChart.jsx
// График динамики веса груза по ключевым статусам (area chart)

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const KEY_STATUSES = [
  { key: "awaiting_docs", label: "Сбор информации", color: "#EAB308" },
  { key: "to_load", label: "Погрузка", color: "#3B82F6" },
  { key: "released", label: "В пути", color: "#22C55E" },
  { key: "kg_customs", label: "Растаможка", color: "#EC4899" },
];

export default function WeightDynamicsChart({ data, granularity }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-100">Динамика веса груза по ключевым статусам</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Нет данных за выбранный период
        </div>
      </div>
    );
  }

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

  const formatWeight = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}т`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}кг`;
    }
    return `${value}кг`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
      return (
        <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
          <div className="font-medium text-gray-800 mb-2">{date}</div>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span style={{ color: entry.color }}>{entry.name}:</span>
                </div>
                <span className="font-medium text-gray-800">{formatWeight(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-100">Динамика веса груза по ключевым статусам</h3>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tickFormatter={formatWeight}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => <span className="text-gray-300">{value}</span>}
            />
            
            {KEY_STATUSES.map((status, index) => (
              <Area
                key={status.key}
                type="monotone"
                dataKey={status.key}
                name={status.label}
                stackId="1"
                stroke={status.color}
                fill={status.color}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
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
