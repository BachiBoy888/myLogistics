// src/components/auth/LoginScreen.jsx
import React, { useState, useEffect } from "react";

export default function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const canProceed = login.trim() && password.trim();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && canProceed) onLogin?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canProceed, onLogin]);

  return (
    <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-xl bg-black text-white grid place-items-center text-xl font-bold">
            PL
          </div>
          <div className="text-xs tracking-wider text-neutral-500">
            Торгово-логистическая компания
          </div>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canProceed) onLogin?.();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Логин</span>
            <input
              type="text"
              className="h-11 rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Пароль</span>
            <input
              type="password"
              className="h-11 rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
            />
          </label>

          <button
            className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50"
            disabled={!canProceed}
          >
            Войти
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Нажимая «Войти», вы соглашаетесь с правилами использования.
        </p>
      </div>
    </main>
  );
}