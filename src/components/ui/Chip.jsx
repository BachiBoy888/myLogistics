// src/components/ui/Chip.jsx
import React from "react";

export default function Chip({ className = "", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}