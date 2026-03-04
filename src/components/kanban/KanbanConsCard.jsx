// src/components/kanban/KanbanConsCard.jsx
// Карточка консолидации для канбана

import React from "react";
import { humanConsStatus, badgeColorByConsStatus } from "../../constants/statuses.js";

export default function KanbanConsCard({ cons, onClick, plCount }) {
  const statusLabel = humanConsStatus(cons.status);
  const badgeClass = badgeColorByConsStatus(cons.status);

  return (
    <div
      onClick={() => onClick?.(cons)}
      className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-sm border border-indigo-200 p-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Header: Cons Label + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-indigo-700">
          📦 Консолидация
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* PL Count */}
      <div className="text-sm text-gray-700 mb-1">
        {plCount} PL в составе
      </div>

      {/* Cons Name/ID */}
      <div className="text-xs text-gray-500 truncate">
        {cons.name || cons.id || "—"}
      </div>

      {/* Footer: Arrow hint */}
      <div className="flex justify-end mt-2">
        <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Открыть →
        </span>
      </div>
    </div>
  );
}
