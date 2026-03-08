// src/components/auth/FirstLoginScreen.jsx
// Экран первичной авторизации для новых сотрудников

import React, { useState, useEffect } from 'react';
import { verifyFirstLoginToken, setFirstLoginPassword } from '../../api/client.js';
import { Lock, User, ArrowRight, CheckCircle, AlertCircle, Package } from 'lucide-react';

export default function FirstLoginScreen({ token, onLogin }) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  // Проверяем токен при загрузке
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Ссылка недействительна или устарела');
        setLoading(false);
        setVerifying(false);
        return;
      }

      try {
        const data = await verifyFirstLoginToken(token);
        setUser(data);
      } catch (err) {
        setError('Ссылка недействительна или устарела');
      } finally {
        setLoading(false);
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await setFirstLoginPassword(token, password);
      setSuccess(true);
      // Автоматически входим после успешной установки пароля
      setTimeout(() => {
        onLogin?.();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Не удалось установить пароль');
    } finally {
      setLoading(false);
    }
  }

  // Показываем ошибку если токен невалиден
  if (!verifying && error && !user) {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
        <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-rose-500 text-white grid place-items-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Ошибка</h1>
          </div>
          
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700 text-center">
            {error}
          </div>
          
          <p className="mt-6 text-center text-sm text-gray-500">
            Обратитесь к администратору для получения новой ссылки.
          </p>
        </div>
      </main>
    );
  }

  // Показываем успех после установки пароля
  if (success) {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-[#FAF3DD] p-4">
        <div className="w-full max-w-[380px] rounded-2xl bg-white shadow-xl p-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-green-500 text-white grid place-items-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Готово!</h1>
          </div>
          
          <p className="text-center text-gray-600 mb-4">
            Пароль успешно установлен. Сейчас вы войдёте в систему.
          </p>
          
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
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
            <Package className="w-7 h-7" />
          </div>
          <div className="text-xs tracking-wider text-neutral-500">
            Торгово-логистическая компания
          </div>
        </div>

        {user && (
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Добро пожаловать!
            </h1>
            <p className="text-sm text-gray-500">
              Установите пароль для входа в систему
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">
              <User className="w-4 h-4" />
              {user.name}
            </div>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700 flex items-center gap-1">
              <Lock className="w-4 h-4" /> Новый пароль
            </span>
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
              minLength={6}
              required
            />
          </label>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Установить пароль
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          После установки пароля вы сможете войти в систему.
        </p>
      </div>
    </main>
  );
}
