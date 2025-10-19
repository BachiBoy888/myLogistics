// src/components/ui/KV.jsx
import React from "react";

export default function KV({ label, value, good = true }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <span
        className={`text-sm font-medium ${
          good ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}