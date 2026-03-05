// src/views/AnalyticsPage.jsx
// Analytics dashboard with charts - Trello dark theme

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { StageLabels, OrderedStages } from "../constants/statuses.js";

// Мок данные для графиков
const mockStageData = [
  { name: "Обращение", count: 12, value: 12 },
  { name: "Сбор док", count: 8, value: 8 },
  { name: "Сбор груза", count: 5, value: 5 },
  { name: "Погрузка", count: 15, value: 15 },
  { name: "Оформление", count: 23, value: 23 },
  { name: "В пути", count: 45, value: 45 },
  { name: "Растаможка", count: 18, value: 18 },
  { name: "Оплата", count: 32, value: 32 },
  { name: "Закрыто", count: 156, value: 156 },
];

const mockClientData = [
  { name: "ИП Смирнов", value: 45, color: "#3B82F6" },
  { name: "ООО Глобал", value: 38, color: "#10B981" },
  { name: "ИП Ким", value: 28, color: "#8B5CF6" },
  { name: "ООО Техно", value: 22, color: "#F59E0B" },
  { name: "Другие", value: 67, color: "#6B7280" },
];

const mockTrendData = [
  { month: "Янв", pl: 120, cons: 15 },
  { month: "Фев", pl: 145, cons: 18 },
  { month: "Мар", pl: 180, cons: 22 },
  { month: "Апр", pl: 165, cons: 20 },
  { month: "Май", pl: 210, cons: 28 },
  { month: "Июн", pl: 245, cons: 32 },
];

const mockWeightData = [
  { stage: "Погрузка", kg: 45000 },
  { stage: "В пути", kg: 125000 },
  { stage: "Растаможка", kg: 68000 },
  { stage: "Оплата", kg: 92000 },
];

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#6B7280", "#EC4899"];

// Компонент карточки метрики
function MetricCard({ title, value, subtitle, trend, icon }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend > 0 ? "text-green-400" : "text-red-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

// Компонент графика в карточке
function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 ${className}`}>
      <h3 className="text-gray-200 font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("month");
  
  const periods = [
    { key: "today", label: "Сегодня" },
    { key: "week", label: "Неделя" },
    { key: "month", label: "Месяц" },
    { key: "quarter", label: "Квартал" },
  ];

  const totalStats = useMemo(() => ({
    pl: 342,
    cons: 42,
    weight: 384500,
    volume: 1250,
    clients: 28,
    profit: 125000,
  }), []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Аналитика</h1>
            <p className="text-sm text-gray-400 mt-0.5">Управленческий экран для анализа ключевых метрик</p>
          </div>
          
          <div className="flex items-center gap-2">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard title="Всего PL" value={totalStats.pl} trend={12} />
          <MetricCard title="Консолидации" value={totalStats.cons} trend={8} />
          <MetricCard title="Клиенты" value={totalStats.clients} />
          <MetricCard title="Общий вес" value={`${(totalStats.weight / 1000).toFixed(1)}т`} />
          <MetricCard title="Объём" value={`${totalStats.volume}м³`} />
          <MetricCard title="Прибыль" value={`$${(totalStats.profit / 1000).toFixed(0)}к`} trend={15} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Распределение по этапам" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Топ клиентов" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockClientData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockClientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {mockClientData.map((client) => (
                <div key={client.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: client.color }} />
                  <span className="text-xs text-gray-400">{client.name} ({client.value})</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Динамика PL и консолидаций" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrendData}>
                <defs>
                  <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Area type="monotone" dataKey="pl" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPL)" name="PL" />
                <Area type="monotone" dataKey="cons" stroke="#10B981" fillOpacity={1} fill="url(#colorCons)" name="Консолидации" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Вес по этапам (кг)" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockWeightData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="stage" type="category" stroke="#9CA3AF" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value) => `${(value / 1000).toFixed(1)} т`}
                />
                <Bar dataKey="kg" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Stage Summary Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700">
            <h3 className="text-gray-200 font-semibold">Сводка по этапам</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-5 py-3 text-sm font-medium text-gray-400">Этап</th>
                  <th className="text-right px-5 py-3 text-sm font-medium text-gray-400">PL</th>
                  <th className="text-right px-5 py-3 text-sm font-medium text-gray-400">Конс</th>
                  <th classNameName="text-right px-5 py-3 text-sm font-medium text-gray-400">Вес, кг</th>
                  <th className="text-right px-5 py-3 text-sm font-medium text-gray-400">Объём, м³</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {OrderedStages.map((stage, idx) => (
                  <tr key={stage} className="hover:bg-gray-700/30">
                    <td className="px-5 py-3 text-sm text-gray-300">{StageLabels[stage]}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-400">{mockStageData[idx]?.count || 0}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-400">{Math.floor((mockStageData[idx]?.count || 0) / 3)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-400">{(idx * 12500).toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-400">{(idx * 45).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
