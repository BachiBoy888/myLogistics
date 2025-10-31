// src/components/ui/Label.jsx
import React from "react";

export default function Label({ className = "", children }) {
  return <div className={`text-sm text-gray-700 ${className}`}>{children}</div>;
}