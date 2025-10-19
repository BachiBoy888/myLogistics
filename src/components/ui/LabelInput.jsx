// src/components/ui/LabelInput.jsx
import React from "react";

export default function LabelInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  inputClass = "",
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <input
        type={type}
        className={`border rounded-lg px-3 py-2 min-h-[44px] ${inputClass}`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}