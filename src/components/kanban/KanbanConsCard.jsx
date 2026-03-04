// src/components/kanban/KanbanConsCard.jsx
// Карточка консолидации для канбана

import React from "react";
import { Truck, Package } from "lucide-react";

export default function KanbanConsCard({ cons, onClick, plCount }) {
  return (
    <div
      onClick={() => onClick?.(cons)}
      className="bg-blue-50 rounded-lg border border-blue-200 p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all mb-2"
    >
      {/* Header: Cons Number + Icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
          <Truck className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm text-blue-900">
          {cons.number || `CONS-${cons.id}`}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-blue-700">
        <div className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5" />
          <span>{plCount} PL</span>
        </div>
        {cons.weight_kg > 0 && (
          <span>{cons.weight_kg} кг</span>
        )}
        {cons.volume_cbm > 0 && (
          <span>{cons.volume_cbm} м³</span>
        )}
      </div>
    </div>
  );
}
