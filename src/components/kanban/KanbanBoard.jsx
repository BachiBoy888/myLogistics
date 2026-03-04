// src/components/kanban/KanbanBoard.jsx
// Основной компонент канбан-доски

import React from "react";
import KanbanColumn from "./KanbanColumn.jsx";
import { StageLabels, OrderedStages } from "../../constants/statuses.js";

export default function KanbanBoard({
  groupedPLs,
  groupedCons,
  onPLClick,
  onConsClick,
  clientNameOf,
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
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
        />
      ))}
    </div>
  );
}
