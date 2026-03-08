// src/components/auth/FirstLoginScreen.jsx
// Экран первичной авторизации для новых сотрудников

import React, { useState, useEffect } from 'react';
import { verifyFirstLoginToken, setFirstLoginPassword } from '../../api/client.js';

export default function FirstLoginScreen({ token, onLogin }) {
  const [step, setStep] = useState('verifying'); // verifying | form | success
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setErr('Неверная ссылка. Обратитесь к администратору.');
      setStep('error');
      return;
    }

    // Проверяем токен
    verifyFirstLoginToken(token)
      .then((u) => {
        setUser(u);
        setStep('form');
      })
      .catch(() => {
        setErr('Ссылка недействительна или устарела. Обратитесь к администратору.');
        setStep('error');
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (password.length < 6) {
      setErr('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setErr('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await setFirstLoginPassword(token, password);
      setStep('success');
      // Автоматически логиним через небольшую задержку
      setTimeout(() => {
        onLogin?.();
      }, 1500);
    } catch (e) {
      setErr(e.message || 'Не удалось установить пароль');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verifying') {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
        <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-black text-white grid place-items-center text-xl font-bold mx-auto mb-4">
            PL
          </div>
          <p className="text-neutral-600">Проверка ссылки...</p>
        </div>
      </main>
    );
  }

  if (step === 'error') {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
        <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-black text-white grid place-items-center text-xl font-bold mx-auto mb-4">
            PL
          </div>
          <div className="text-rose-600 mb-4">{err}</div>
          <p className="text-sm text-neutral-500">
            Обратитесь к администратору для получения новой ссылки.
          </p>
        </div>
      </main>
    );
  }

  if (step === 'success') {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
        <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-black text-white grid place-items-center text-xl font-bold mx-auto mb-4">
            PL
          </div>
          <h2 className="text-xl font-semibold mb-2">Пароль установлен!</h2>
          <p className="text-neutral-600 mb-4">
            Привет, {user?.name}! Пароль успешно сохранён.
          </p>
          <p className="text-sm text-neutral-500">Входим в систему...</p>
        </div>
      </main>
    );
  }

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

        {/* Приветствие */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Добро пожаловать!</h2>
          <p className="text-neutral-600">
            Привет, {user?.name}. Установи пароль для входа.
          </p>
        </div>

        {/* Форма */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Новый пароль</span>
            <input
              type="password"
              autoFocus
              className="h-11 rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              minLength={6}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Подтвердите пароль</span>
            <input
              type="password"
              className="h-11 rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
            />
          </label>

          <button
            className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50"
            disabled={!password || !confirmPassword || loading}
          >
            {loading ? 'Сохраняем...' : 'Установить пароль'}
          </button>

          {err && <div className="text-sm text-rose-600">{err}</div>}
        </form>
      </div>
    </main>
  );
}
