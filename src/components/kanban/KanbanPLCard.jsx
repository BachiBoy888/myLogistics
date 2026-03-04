// src/components/kanban/KanbanPLCard.jsx
// Карточка PL для канбана с drag & drop и множественным выбором

import React from "react";

export default function KanbanPLCard({ 
  pl, 
  onClick, 
  clientName,
  onDragStart,
  isSelected,
  onSelect,
}) {
  const cargoName = pl.title || pl.name || pl.cargo_name || "Без названия";
  const weight = pl.weight_kg || pl.weight || 0;
  const volume = pl.volume_cbm || pl.volume || 0;

  const handleClick = (e) => {
    // Shift+click для множественного выбора
    if (e.shiftKey && onSelect) {
      e.stopPropagation();
      onSelect(pl.id, true);
    } else {
      onClick?.(pl);
    }
  };

  const handleDragStart = (e) => {
    onDragStart?.(pl, e);
  };

  // Получаем инициалы клиента для аватара
  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Цвет аватара по id клиента
  const getAvatarColor = (clientId) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", 
      "bg-orange-500", "bg-pink-500", "bg-teal-500"
    ];
    if (!clientId) return colors[0];
    return colors[clientId % colors.length];
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all group select-none ${
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-200 shadow-md" 
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Top: PL Number + dots menu */}
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-sm text-gray-800">
          {pl.pl_number || `PL-${pl.id}`}
        </span>
        <button 
          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          onClick={(e) => {
            e.stopPropagation();
            // Menu logic
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Cargo Name */}
      <div className="text-sm font-medium text-gray-900 mb-1 truncate">
        {cargoName}
      </div>

      {/* Client Name */}
      <div className="text-xs text-gray-500 mb-3 truncate">
        {clientName || "—"}
      </div>

      {/* Progress dots + Avatar */}
      <div className="flex items-center justify-between">
        {/* Progress indicator - 5 dots */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i <= 3 ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Client Avatar */}
        <div className={`w-6 h-6 rounded-full ${getAvatarColor(pl.client_id)} flex items-center justify-center text-white text-xs font-medium`}>
          {getInitials(clientName)}
        </div>
      </div>

      {/* Weight/Volume info */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
        {weight > 0 && (
          <span>{weight} кг</span>
        )}
        {volume > 0 && (
          <span>{volume} м³</span>
        )}
      </div>
    </div>
  );
}
