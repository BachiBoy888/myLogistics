// src/components/auth/LoginScreen.jsx
import React, { useState, useEffect } from "react";
import { login as apiLogin } from "../../api/client.js";

export default function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const canProceed = login.trim() && password.trim();

  async function doSubmit() {
    if (!canProceed) return;
    setErr("");
    try {
      await apiLogin({ login, password });
      onLogin?.();
    } catch (e) {
      setErr("Неверный логин или пароль");
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && canProceed) doSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canProceed]);

  return (
    <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
        {/* ... шапка оставляем ... */}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            doSubmit();
          }}
        >
          {/* поля логин/пароль как были */}
          <button className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50" disabled={!canProceed}>
            Войти
          </button>
          {err && <div className="text-sm text-rose-600">{err}</div>}
        </form>

        {/* ... */}
      </div>
    </main>
  );
}