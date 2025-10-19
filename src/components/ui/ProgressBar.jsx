// src/components/ui/ProgressBar.jsx
import React from "react";

export default function ProgressBar({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div className="h-2 bg-black rounded-full" style={{ width: `${v}%` }} />
    </div>
  );
}