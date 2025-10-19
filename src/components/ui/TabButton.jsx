// src/components/ui/TabButton.jsx
import React from "react";

export default function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 rounded-lg text-sm min-h-[40px] transition " +
        (active
          ? "bg-black text-white"
          : "bg-transparent text-gray-700 hover:bg-gray-100 border")
      }
    >
      {children}
    </button>
  );
}