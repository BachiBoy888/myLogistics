// src/components/ui/LabelInput.jsx
import React, { useId } from "react";

export default function LabelInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  inputClass = "",
  required = false,
}) {
  const id = useId();
  
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm text-gray-600">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`border rounded-lg px-3 py-2 min-h-[44px] ${inputClass}`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
      />
    </div>
  );
}