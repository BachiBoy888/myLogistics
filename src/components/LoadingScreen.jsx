// src/components/LoadingScreen.jsx
import React from "react";

export default function LoadingScreen() {
  return (
    <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
        <div className="text-center text-sm text-neutral-600">Загрузка…</div>
      </div>
    </main>
  );
}