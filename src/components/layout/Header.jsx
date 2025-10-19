// src/components/layout/Header.jsx
import React from "react";
import TabButton from "../ui/TabButton";

export default function Header({ mode, onChangeMode }) {
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="text-lg font-semibold">Моя Логистика</div>
          <nav className="flex items-center gap-2">
            <TabButton active={mode === "cargo"} onClick={() => onChangeMode("cargo")}>
              Мои грузы
            </TabButton>
            <TabButton active={mode === "clients"} onClick={() => onChangeMode("clients")}>
              Мои клиенты
            </TabButton>
            <TabButton active={mode === "warehouses"} onClick={() => onChangeMode("warehouses")}>
              Мои склады
            </TabButton>
            <TabButton active={mode === "logistics"} onClick={() => onChangeMode("logistics")}>
              Мои логисты
            </TabButton>
            <TabButton active={mode === "consolidations"} onClick={() => onChangeMode("consolidations")}>
              Мои консолидации
            </TabButton>
          </nav>
        </div>
      </div>
    </header>
  );
}