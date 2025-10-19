// src/components/layout/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="max-w-7xl mx-auto p-6 text-xs text-gray-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>© 2025 Моя логистика • </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline">Powered by Research and Development</span>
      </div>
    </footer>
  );
}