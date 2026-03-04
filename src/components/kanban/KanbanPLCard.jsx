// src/components/kanban/KanbanPLCard.jsx
// Карточка PL для канбана (стиль Trello)

import React from "react";
import { humanStatus, badgeColorByStatus } from "../../constants/statuses.js";

export default function KanbanPLCard({ pl, onClick, clientName }) {
  const statusLabel = humanStatus(pl.status);
  const badgeClass = badgeColorByStatus(pl.status);

  return (
    <div
      onClick={() => onClick?.(pl)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Header: PL Number + Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-sm font-semibold text-gray-700">
          {pl.pl_number || "PL-???"}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* Client Name */}
      <div className="text-sm font-medium text-gray-900 mb-1 truncate">
        {clientName || "—"}
      </div>

      {/* Title */}
      <div className="text-xs text-gray-600 mb-2 line-clamp-2">
        {pl.title || pl.name || "Без названия"}
      </div>

      {/* Footer: Weight + Volume */}
      <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
        {pl.weight_kg && (
          <span>⚖️ {pl.weight_kg} кг</span>
        )}
        {pl.volume_cbm && (
          <span>📦 {pl.volume_cbm} м³</span>
        )}
      </div>
    </div>
  );
}
