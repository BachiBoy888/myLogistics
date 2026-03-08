// src/components/kanban/KanbanPLCard.jsx
// Карточка PL для канбана в стиле Trello

import React, { useState } from "react";

export default function KanbanPLCard({ 
  pl, 
  onClick, 
  clientName,
  isSelected,
  onSelect,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const cargoName = pl.title || pl.name || pl.cargo_name || "Без названия";
  const weight = pl.weight_kg || pl.weight || 0;
  const volume = pl.volume_cbm || pl.volume || 0;
  
  // Данные ответственного пользователя
  const responsible = pl.responsible || {};
  const responsibleName = responsible.name || null;
  const responsibleAvatar = responsible.avatar || null;
  
  // Определяем что показывать в аватаре
  const renderAvatar = () => {
    // 1. Если есть аватар → показываем фото
    if (responsibleAvatar) {
      return (
        <img 
          src={responsibleAvatar} 
          alt={responsibleName || "Аватар"}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    
    // 2. Если есть имя → показываем инициалы
    if (responsibleName) {
      const getInitials = (name) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
          return parts[0][0].toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      };
      return getInitials(responsibleName);
    }
    
    // 3. Если нет ответственного → показываем "?"
    return "?";
  };

  const handleClick = (e) => {
    if (e.shiftKey) {
      e.stopPropagation();
      onSelect?.(pl.id, true);
    } else {
      onClick?.(pl);
    }
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    
    const selectedIds = onSelect?.selectedIds || [];
    if (selectedIds.includes(pl.id) && selectedIds.length > 1) {
      e.dataTransfer.setData("text/plain", JSON.stringify({ plIds: selectedIds }));
    } else {
      e.dataTransfer.setData("text/plain", JSON.stringify({ plId: pl.id }));
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const getAvatarColor = (clientId) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", 
      "bg-orange-500", "bg-pink-500", "bg-teal-500"
    ];
    if (!clientId) return colors[0];
    return colors[clientId % colors.length];
  };

  // Цвет прогресса
  const getProgressColor = (status) => {
    const progressMap = {
      draft: 1,
      awaiting_docs: 2,
      awaiting_load: 3,
      to_load: 4,
      loaded: 5,
      to_customs: 6,
      released: 7,
      kg_customs: 8,
      collect_payment: 9,
      delivered: 10,
      closed: 11,
    };
    return progressMap[status] || 1;
  };

  const progress = getProgressColor(pl.status);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`bg-gray-800 rounded-lg border p-3 cursor-pointer hover:shadow-lg transition-all group select-none ${
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500/20" 
          : "border-gray-600 hover:border-gray-500"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Top: PL Number + menu */}
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-sm text-gray-100">
          {pl.pl_number?.replace(/-?\d{4}-?/, '-') || `PL-${pl.id}`}
        </span>
        <button 
          className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Cargo Name */}
      <div className="text-sm font-medium text-gray-200 mb-1 truncate">
        {cargoName}
      </div>

      {/* Client Name */}
      <div className="text-xs text-gray-400 mb-3 truncate">
        {clientName || "—"}
      </div>

      {/* Progress dots + Avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i <= Math.ceil(progress / 2.2) ? "bg-blue-500" : "bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className={`w-7 h-7 rounded-full ${getAvatarColor(responsible.id)} flex items-center justify-center text-white text-xs font-medium overflow-hidden`}>
          {renderAvatar()}
        </div>
      </div>

      {/* Weight/Volume */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-3 text-xs text-gray-500">
        {weight > 0 && <span>{weight} кг</span>}
        {volume > 0 && <span>{volume} м³</span>}
      </div>
    </div>
  );
}
