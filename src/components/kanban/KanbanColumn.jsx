// src/components/kanban/KanbanColumn.jsx
// Колонка канбана в стиле Trello

import React from "react";
import KanbanPLCard from "./KanbanPLCard.jsx";
import KanbanConsCard from "./KanbanConsCard.jsx";
import { PlusCircle } from "lucide-react";

// Цвета для каждого этапа (соответствуют скриншоту)
const stageColors = {
  intake: { dot: "bg-gray-400", border: "border-gray-500" },
  collect_docs: { dot: "bg-yellow-400", border: "border-yellow-500" },
  collect_cargo: { dot: "bg-orange-400", border: "border-orange-500" },
  loading: { dot: "bg-blue-400", border: "border-blue-500" },
  cn_formalities: { dot: "bg-purple-400", border: "border-purple-500" },
  in_transit: { dot: "bg-indigo-400", border: "border-indigo-500" },
  kg_customs: { dot: "bg-pink-400", border: "border-pink-500" },
  payment: { dot: "bg-teal-400", border: "border-teal-500" },
  closed_stage: { dot: "bg-gray-500", border: "border-gray-600" },
};

export default function KanbanColumn({
  stage,
  label,
  pls,
  cons,
  allPLs,
  onPLClick,
  onConsClick,
  clientNameOf,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  selectedPLs,
  onSelectPL,
  showCreateCons,
  onCreateCons,
  isLast,
}) {
  const count = (pls?.length || 0) + (cons?.length || 0);
  const colors = stageColors[stage] || stageColors.intake;

  return (
    <div
      className={`flex-shrink-0 w-80 flex flex-col h-full ${
        isLast ? "" : "border-r border-gray-700/50"
      } ${isDragOver ? "bg-gray-800/30" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="px-3 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className="font-semibold text-sm text-gray-200">{label}</span>
          <span className="bg-gray-700/50 text-gray-400 text-xs px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {count}
          </span>
        </div>
        <button className="text-gray-500 hover:text-gray-300 p-1 rounded hover:bg-gray-700/50">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2">
        {/* Create Cons Button - только в Погрузка */}
        {showCreateCons && (
          <button
            onClick={onCreateCons}
            className="w-full flex items-center justify-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-purple-400 hover:text-purple-300 py-2 px-3 rounded-lg text-sm transition-all border border-dashed border-purple-500/30 hover:border-purple-500/50 mb-2"
          >
            <PlusCircle className="w-4 h-4" />
            Создать консолидацию
          </button>
        )}

        {/* Consolidations */}
        {cons?.map((c) => (
          <KanbanConsCard
            key={`cons-${c.id}`}
            cons={c}
            onClick={onConsClick}
            onPLClick={onPLClick}
            pls={allPLs?.filter((p) => c.pl_ids?.includes(p.id)) || []}
            clientNameOf={clientNameOf}
            stageColor={colors}
          />
        ))}

        {/* PL Cards not in consolidations */}
        {pls
          ?.filter((pl) => !cons?.some((c) => c.pl_ids?.includes(pl.id)))
          .map((pl) => (
            <KanbanPLCard
              key={`pl-${pl.id}`}
              pl={pl}
              onClick={onPLClick}
              clientName={clientNameOf?.(pl)}
              isSelected={selectedPLs?.includes(pl.id)}
              onSelect={onSelectPL}
            />
          ))}

        {/* Empty state */}
        {count === 0 && !showCreateCons && (
          <div className="text-center py-8 text-gray-500 text-sm">Нет грузов</div>
        )}
      </div>
    </div>
  );
}
