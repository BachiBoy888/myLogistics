// src/views/AnalyticsPage.jsx
// Аналитика с графиками из daily snapshots

import React, { useState, useMemo } from "react";
import { useAnalytics } from "../hooks/useAnalytics.js";
import ClientDynamicsChart from "../components/analytics/ClientDynamicsChart.jsx";
import PLStatusChart from "../components/analytics/PLStatusChart.jsx";
import WeightDynamicsChart from "../components/analytics/WeightDynamicsChart.jsx";

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState("day"); // day | week | month
  
  // Ограничиваем выбор to <= yesterday
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: yesterday,
  });

  const { data, loading, error } = useAnalytics(dateRange, granularity);

  const handleDateChange = (field, value) => {
    // Если выбрали today, показываем подсказку
    if (field === "to" && value > yesterday) {
      alert("Данные за сегодня будут доступны завтра");
      return;
    }
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Форматируем дату для отображения
  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasData = data?.clientDynamics?.some(d => d.total > 0 || d.active > 0);

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
              max={yesterday}
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

      {/* Meta Info Banner */}
      {data?.meta && (
        <div className="bg-blue-900/30 border-b border-blue-800 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-blue-300">
              🔄 Обновление данных: 1 раз в день
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">
              Последнее обновление: <span className="text-gray-100">{formatDateTime(data.meta.generatedAt)}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">
              Данные за: <span className="text-gray-100">{data.meta.lastSnapshotDay || "—"}</span>
            </span>
          </div>
        </div>
      )}

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

        {!loading && !error && !hasData && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Нет данных за выбранный период</h3>
            <p className="text-gray-500">
              Снимки аналитики ещё не построены. Данные будут доступны после первого запуска скрипта.
            </p>
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Chart 1: Client Dynamics */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Динамика клиентов</h3>
              <div className="min-h-[320px]">
                <ClientDynamicsChart 
                  data={data.clientDynamics} 
                  granularity={granularity}
                />
              </div>
            </div>

            {/* Chart 2: PL by Status */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">PL по статусам</h3>
              <div className="min-h-[320px]">
                <PLStatusChart 
                  data={data.plByStatus} 
                  granularity={granularity}
                />
              </div>
            </div>

            {/* Chart 3: Weight Dynamics */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Динамика веса по этапам</h3>
              <div className="min-h-[320px]">
                <WeightDynamicsChart 
                  data={data.weightDynamics} 
                  granularity={granularity}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
