// src/components/ui/ActionBtn.jsx
import React from "react";

export default function ActionBtn({ className = "", disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm min-h-[40px] border disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}