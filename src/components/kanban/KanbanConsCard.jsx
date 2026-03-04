// src/components/kanban/KanbanConsCard.jsx
import React, { useState } from "react";
import { Truck, ChevronDown, ChevronUp } from "lucide-react";

export default function KanbanConsCard({ cons, onClick, pls, clientNameOf }) {
  const [expanded, setExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const totalWeight = pls?.reduce((sum, p) => sum + (p.weight_kg || 0), 0) || 0;
  const totalVolume = pls?.reduce((sum, p) => sum + (p.volume_cbm || 0), 0) || 0;

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ consId: cons.id }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-gray-800 rounded-lg border border-gray-600 p-3 mb-2 cursor-pointer hover:border-gray-500 transition-all ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-blue-300">
            {cons.number?.replace(/-?\d{4}-?/, '-') || `CONS-${cons.id}`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-gray-400 hover:text-gray-200"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
        <span>📦 {pls?.length || 0} PL</span>
        {totalWeight > 0 && <span>{totalWeight} кг</span>}
        {totalVolume > 0 && <span>{totalVolume} м³</span>}
      </div>

      {/* Expanded PL List */}
      {expanded && pls?.length > 0 && (
        <div className="space-y-1 mt-2 pt-2 border-t border-gray-700">
          {pls.map((pl, idx) => (
            <div
              key={pl.id}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(pl);
              }}
              className="bg-gray-700/50 rounded p-2 text-xs hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200">
                  #{idx + 1} {pl.pl_number || `PL-${pl.id}`}
                </span>
              </div>
              <div className="text-gray-400 truncate">{pl.title || pl.name}</div>
              <div className="text-gray-500 truncate">{clientNameOf?.(pl) || "—"}</div>
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                {pl.weight_kg > 0 && <span>{pl.weight_kg} кг</span>}
                {pl.volume_cbm > 0 && <span>{pl.volume_cbm} м³</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click to open cons details */}
      <div
        onClick={() => onClick?.(cons)}
        className="mt-2 text-xs text-blue-400 hover:text-blue-300 text-center py-1"
      >
        Открыть консолидацию
      </div>
    </div>
  );
}
