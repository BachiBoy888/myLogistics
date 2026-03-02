// src/views/AnalyticsPage.jsx
// Analytics dashboard page

import React, { useState } from "react";
import { useMetrics, useHealth } from "../hooks/useMetrics.js";
import MetricsCards from "../components/MetricsCards.jsx";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("today");
  const { metrics, loading, error } = useMetrics(period);
  const health = useHealth();

  const periods = [
    { key: "today", label: "Сегодня" },
    { key: "week", label: "Неделя" },
    { key: "month", label: "Месяц" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Аналитика</h1>
        <p className="text-sm text-gray-600">
          Управленческий экран для анализа ключевых метрик
        </p>
      </div>

      {/* System Status */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              health.loading
                ? "bg-yellow-400 animate-pulse"
                : health.online
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
          <span className="font-medium text-gray-800">
            Система:{" "}
            {health.loading
              ? "Проверка..."
              : health.online
              ? "Онлайн"
              : "Недоступна"}
          </span>
          {!health.loading && health.online && (
            <span className="text-sm text-green-600">🟢 Все системы работают</span>
          )}
          {!health.loading && !health.online && (
            <span className="text-sm text-red-600">🔴 Проблема с подключением</span>
          )}
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      {loading && (
        <div className="text-center py-8 text-gray-500">Загрузка метрик...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Ошибка загрузки метрик: {error}
        </div>
      )}

      {!loading && !error && metrics && (
        <MetricsCards metrics={metrics} period={period} />
      )}

      {/* Info Block */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <strong>💡 На заметку:</strong> Сейчас отображаются тестовые значения (0).
          Интеграция с реальными данными из БД будет реализована в следующем спринте.
        </div>
      </div>
    </div>
  );
}
