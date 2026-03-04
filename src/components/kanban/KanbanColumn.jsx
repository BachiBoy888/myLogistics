// src/components/kanban/KanbanColumn.jsx
import React from "react";
import KanbanPLCard from "./KanbanPLCard.jsx";
import KanbanConsCard from "./KanbanConsCard.jsx";
import { PlusCircle } from "lucide-react";

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

  // Color indicator for each stage
  const stageColors = {
    intake: "bg-gray-400",
    collect_docs: "bg-yellow-500",
    collect_cargo: "bg-orange-500",
    loading: "bg-blue-500",
    cn_formalities: "bg-purple-500",
    in_transit: "bg-indigo-500",
    kg_customs: "bg-pink-500",
    payment: "bg-teal-500",
    closed_stage: "bg-gray-600",
  };

  return (
    <div
      className={`flex-shrink-0 w-80 flex flex-col h-full border-r border-gray-700 ${
        isDragOver ? "bg-gray-800/50" : ""
      } ${isLast ? "border-r-0" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="px-3 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stageColors[stage] || "bg-gray-400"}`} />
          <span className="font-semibold text-sm text-gray-200">{label}</span>
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {count}
          </span>
        </div>
        <button className="text-gray-500 hover:text-gray-300 p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Create Cons Button */}
        {showCreateCons && (
          <button
            onClick={onCreateCons}
            className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-gray-700 text-purple-400 hover:text-purple-300 py-2 px-3 rounded-lg text-sm transition-colors border border-dashed border-purple-500/50"
          >
            <PlusCircle className="w-4 h-4" />
            Создать консолидацию
          </button>
        )}

        {/* Consolidations with their PLs */}
        {cons?.map((c) => (
          <KanbanConsCard
            key={`cons-${c.id}`}
            cons={c}
            onClick={onConsClick}
            onPLClick={onPLClick}
            pls={allPLs?.filter((p) => c.pl_ids?.includes(p.id)) || []}
            clientNameOf={clientNameOf}
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
