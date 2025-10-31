// src/components/ui/ToggleChip.jsx
import React from "react";

export default function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm border min-h-[36px] ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}