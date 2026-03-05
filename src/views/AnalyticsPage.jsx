// src/views/AnalyticsPage.jsx
// Аналитика с графиками по реальным данным из БД

import React, { useState, useEffect, useMemo } from "react";
import { useAnalytics } from "../hooks/useAnalytics.js";
import ClientDynamicsChart from "../components/analytics/ClientDynamicsChart.jsx";
import PLStatusChart from "../components/analytics/PLStatusChart.jsx";
import WeightDynamicsChart from "../components/analytics/WeightDynamicsChart.jsx";

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState("day"); // day | week | month
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
    to: new Date().toISOString().split("T")[0], // today
  });

  const { data, loading, error } = useAnalytics(dateRange, granularity);

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-semibold text-gray-100">Аналитика</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Период:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange("from", e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg text-sm px-2 py-1 text-gray-100"
            />
            <span className="text-gray-500">—</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange("to", e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg text-sm px-2 py-1 text-gray-100"
            />
          </div>

          {/* Granularity */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
            {[
              { key: "day", label: "День" },
              { key: "week", label: "Неделя" },
              { key: "month", label: "Месяц" },
            ].map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  granularity === g.key
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-600"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Загрузка данных...
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
            Ошибка загрузки: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Chart 1: Client Dynamics */}
            <ClientDynamicsChart 
              data={data.clientDynamics} 
              granularity={granularity}
            />

            {/* Chart 2: PL by Status */}
            <PLStatusChart 
              data={data.plByStatus} 
              granularity={granularity}
            />

            {/* Chart 3: Weight Dynamics */}
            <WeightDynamicsChart 
              data={data.weightDynamics} 
              granularity={granularity}
            />
          </>
        )}
      </div>
    </div>
  );
}
