// src/components/kanban/KanbanColumn.jsx
// Колонка канбана (стиль Trello)

import React from "react";
import KanbanPLCard from "./KanbanPLCard.jsx";
import KanbanConsCard from "./KanbanConsCard.jsx";

export default function KanbanColumn({
  stage,
  label,
  pls,
  cons,
  onPLClick,
  onConsClick,
  clientNameOf,
}) {
  const count = (pls?.length || 0) + (cons?.length || 0);

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 rounded-xl flex flex-col max-h-[calc(100vh-180px)]">
      {/* Column Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-800 truncate">{label}</h3>
        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {count}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Consolidations first */}
        {cons?.map((c) => (
          <KanbanConsCard
            key={`cons-${c.id}`}
            cons={c}
            onClick={onConsClick}
            plCount={c.pl_ids?.length || 0}
          />
        ))}

        {/* PL Cards */}
        {pls?.map((pl) => (
          <KanbanPLCard
            key={`pl-${pl.id}`}
            pl={pl}
            onClick={onPLClick}
            clientName={clientNameOf?.(pl)}
          />
        ))}

        {/* Empty state */}
        {count === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Нет грузов
          </div>
        )}
      </div>
    </div>
  );
}
