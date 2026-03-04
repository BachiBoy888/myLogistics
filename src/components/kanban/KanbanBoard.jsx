// src/components/kanban/KanbanBoard.jsx
// Основной компонент канбан-доски с drag & drop

import React, { useState, useCallback } from "react";
import KanbanColumn from "./KanbanColumn.jsx";
import { StageLabels, OrderedStages } from "../../constants/statuses.js";

export default function KanbanBoard({
  groupedPLs,
  groupedCons,
  onPLClick,
  onConsClick,
  clientNameOf,
  onPLMove,
  selectedPLs,
  onSelectPL,
}) {
  const [draggedPL, setDraggedPL] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const handleDragStart = useCallback((pl, e) => {
    setDraggedPL(pl);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ plId: pl.id, currentStage: pl.stage }));
  }, []);

  const handleDragOver = useCallback((stage, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback((targetStage, e) => {
    e.preventDefault();
    setDragOverStage(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.plId && targetStage && onPLMove) {
        onPLMove(data.plId, targetStage);
      }
    } catch (err) {
      console.error("Drag drop error:", err);
    }
    setDraggedPL(null);
  }, [onPLMove]);

  return (
    <div className="flex gap-4 h-full pb-20">
      {OrderedStages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          label={StageLabels[stage]}
          pls={groupedPLs?.[stage] || []}
          cons={groupedCons?.[stage] || []}
          onPLClick={onPLClick}
          onConsClick={onConsClick}
          clientNameOf={clientNameOf}
          isDragOver={dragOverStage === stage}
          onDragOver={(e) => handleDragOver(stage, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(stage, e)}
          onDragStart={handleDragStart}
          selectedPLs={selectedPLs}
          onSelectPL={onSelectPL}
        />
      ))}
    </div>
  );
}
