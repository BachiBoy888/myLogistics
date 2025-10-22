// src/components/auth/LoginScreen.jsx
import React, { useState, useEffect } from "react";
import { login as apiLogin } from "../../api/client.js";

export default function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canProceed = login.trim() && password.trim();

  async function doSubmit() {
    if (!canProceed || loading) return;
    setErr("");
    setLoading(true);
    try {
      await apiLogin({ login, password }); // установит cookie token
      onLogin?.();                         // App вызовет me() и войдёт
    } catch (e) {
      setErr("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && canProceed) doSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canProceed, login, password, loading]);

  return (
    <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
        {/* Шапка */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-xl bg-black text-white grid place-items-center text-xl font-bold">
            PL
          </div>
          <div className="text-xs tracking-wider text-neutral-500">
            Торгово-логистическая компания
          </div>
        </div>

        {/* Форма */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            doSubmit();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Логин</span>
            <input
              type="text"
              autoFocus
              className="h-11 rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </label>

          <button
            className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50"
            disabled={!canProceed || loading}
          >
            {loading ? "Входим…" : "Войти"}
          </button>

          {err && <div className="text-sm text-rose-600">{err}</div>}
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Нажимая «Войти», вы соглашаетесь с правилами использования.
        </p>
      </div>
    </main>
  );
}