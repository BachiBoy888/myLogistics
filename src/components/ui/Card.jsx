// src/components/ui/Card.jsx
import React from "react";

export default function Card({ title, className = "", children }) {
  return (
    <div className={`border rounded-2xl p-4 bg-white ${className}`}>
      {title && <div className="font-medium mb-3">{title}</div>}
      {children}
    </div>
  );
}