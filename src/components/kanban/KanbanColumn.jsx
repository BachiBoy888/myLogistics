// src/components/kanban/KanbanColumn.jsx
// Колонка канбана с drag & drop поддержкой

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
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  selectedPLs,
  onSelectPL,
}) {
  const count = (pls?.length || 0) + (cons?.length || 0);

  return (
    <div
      className={`flex-shrink-0 w-80 flex flex-col h-full transition-colors ${
        isDragOver ? "bg-blue-50/50" : ""
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-800">{label}</span>
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {count}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Consolidations */}
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
            onDragStart={onDragStart}
            isSelected={selectedPLs?.includes(pl.id)}
            onSelect={onSelectPL}
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
