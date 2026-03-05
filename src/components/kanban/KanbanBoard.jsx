// src/components/kanban/KanbanBoard.jsx
import React, { useState, useCallback } from "react";
import KanbanColumn from "./KanbanColumn.jsx";
import { StageLabels, OrderedStages } from "../../constants/statuses.js";

export default function KanbanBoard({
  groupedPLs,
  groupedCons,
  allPLs,
  onPLClick,
  onConsClick,
  clientNameOf,
  onPLMove,
  selectedPLs,
  onSelectPL,
  consOnly,
  onCreateCons,
}) {
  const [dragOverStage, setDragOverStage] = useState(null);

  const handleDragOver = useCallback((stage, e) => {
    e.preventDefault();
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
      if (data.plIds && data.plIds.length > 0) {
        data.plIds.forEach(plId => onPLMove?.(plId, targetStage));
      } else if (data.plId) {
        onPLMove?.(data.plId, targetStage);
      }
      if (data.consId) {
        onPLMove?.(data.consId, targetStage, true);
      }
    } catch (err) {
      console.error("Drag drop error:", err);
    }
  }, [onPLMove]);

  return (
    <div className="flex h-full overflow-x-auto overflow-y-hidden">
      {OrderedStages.map((stage, index) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          label={StageLabels[stage]}
          pls={groupedPLs?.[stage] || []}
          cons={groupedCons?.[stage] || []}
          allPLs={allPLs}
          onPLClick={onPLClick}
          onConsClick={onConsClick}
          clientNameOf={clientNameOf}
          isDragOver={dragOverStage === stage}
          onDragOver={(e) => handleDragOver(stage, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(stage, e)}
          selectedPLs={selectedPLs}
          onSelectPL={onSelectPL}
          showCreateCons={stage === "loading" && !consOnly}
          onCreateCons={onCreateCons}
          isLast={index === OrderedStages.length - 1}
        />
      ))}
    </div>
  );
}
