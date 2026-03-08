// src/App.jsx — Моя логистика (корневой файл)
import React, { useEffect, useState } from "react";

// API
import {
  getPL,
  createPL,
  updatePL,
  deletePL,
  getClients,
  createClient,
  deleteClient,
  me,
  logout as apiLogout,
} from "./api/client.js";

// UI / каркас
import LoadingScreen from "./components/LoadingScreen.jsx";
import LoginScreen from "./components/auth/LoginScreen.jsx";
import FirstLoginScreen from "./components/auth/FirstLoginScreen.jsx";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import UserProfileModal from "./components/user/UserProfileModal.jsx";
import EmployeesModal from "./components/user/EmployeesModal.jsx";

// Вьюхи
import CargoView from "./views/CargoView.jsx";
import ClientsView from "./views/ClientsView.jsx";
import LogisticsView from "./views/LogisticsView.jsx";
import AnalyticsPage from "./views/AnalyticsPage.jsx";

/* ---------------------------
   Вспомогательные утилиты
----------------------------*/
function sanitizePls(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((p) => p && p.id !== null && p.id !== undefined);
}

function App() {
  const [boot, setBoot] = useState({ loading: true, user: null });
  console.log("BOOT:", boot);

  // Проверяем наличие токена первичной авторизации в URL
  const urlParams = new URLSearchParams(window.location.search);
  const firstLoginToken = urlParams.get('token');
  const isFirstLogin = window.location.pathname === '/first-login' && firstLoginToken;

  // Проверяем сессию при запуске (только если не first-login)
  useEffect(() => {
    // Если это first-login страница, не проверяем сессию
    if (isFirstLogin) {
      setBoot({ loading: false, user: null });
      return;
    }

    (async () => {
      try {
        const u = await me();
        setBoot({ loading: false, user: u });
      } catch {
        setBoot({ loading: false, user: null });
      }
    })();
  }, [isFirstLogin]);

  if (boot.loading) return <LoadingScreen />;

  // Если есть токен первичной авторизации — показываем FirstLoginScreen
  if (isFirstLogin) {
    return (
      <FirstLoginScreen
        token={firstLoginToken}
        onLogin={async () => {
          const u = await me().catch(() => null);
          setBoot({ loading: false, user: u });
          // Очищаем URL от параметров
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  // Пока не залогинен — экран входа
  if (!boot.user) {
    return (
      <LoginScreen
        onLogin={async () => {
          const u = await me().catch(() => null);
          setBoot({ loading: false, user: u });
        }}
      />
    );
  }

  // Выход
  async function handleLogout() {
    await apiLogout().catch(() => {});
    setBoot({ loading: false, user: null });
  }

  return <MainApp user={boot.user} onLogout={handleLogout} />;
}

export default App;

function MainApp({ user, onLogout }) {
  const [pls, setPls] = useState([]);
  const [clients, setClients] = useState([]);
  const [cons, setCons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // активная вкладка
  const [mode, setMode] = useState("cargo");

  // для открытия конкретных сущностей из других вьюх
  const [openPLId, setOpenPLId] = useState(null);
  const [openClientId, setOpenClientId] = useState(null);

  // функция загрузки данных
  async function loadData(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      const [plData, clientData] = await Promise.all([getPL(), getClients()]);
      setPls(sanitizePls(plData));
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch (e) {
      console.error("Ошибка загрузки с API:", e);
      if (String(e?.message || "").includes("401")) onLogout?.();
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // первичная загрузка
  useEffect(() => {
    loadData();
  }, [onLogout]);

  // функция обновления данных
  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }

  // обновление пользователя после изменения профиля
  function handleUserUpdate(updatedUser) {
    setCurrentUser(prev => ({ ...prev, ...updatedUser }));
  }

  // добавление клиента
  async function handleAddClient(newClient) {
    try {
      const saved = await createClient(newClient);
      setClients((prev) => [...prev, saved]);
    } catch (err) {
      console.error("Ошибка при создании клиента:", err);
      alert("Не удалось сохранить клиента");
    }
  }

  // удаление клиента
  async function handleDeleteClient(clientId) {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
  }

  // обновление PL — оптимистично + роллбэк
  async function handleUpdatePL(id, patch) {
    const snapshot = pls;

    // оптимистичное применение
    setPls((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const i = next.findIndex((p) => p && p.id === id);
      if (i !== -1) next[i] = { ...next[i], ...patch };
      return sanitizePls(next);
    });

    try {
      const updated = await updatePL(id, patch);
      setPls((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const i = next.findIndex((p) => p && p.id === id);
        if (i !== -1) next[i] = updated;
        return sanitizePls(next);
      });
    } catch (err) {
      console.error("Ошибка при обновлении PL:", err);
      setPls(sanitizePls(snapshot)); // роллбэк
      alert("Не удалось обновить PL");
    }
  }

  // удаление PL
  async function handleDeletePL(id) {
    try {
      await deletePL(id);
      setPls((prev) => sanitizePls(prev).filter((p) => p.id !== id));
    } catch (err) {
      console.error("Ошибка при удалении PL:", err);
      alert("Не удалось удалить PL");
    }
  }

  if (loading) return <LoadingScreen />;

  const safePls = sanitizePls(pls);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header mode={mode} onChangeMode={setMode} user={currentUser} onLogout={onLogout} onRefresh={handleRefresh} isRefreshing={isRefreshing} onOpenProfile={() => setShowProfile(true)} onOpenEmployees={() => setShowEmployees(true)} />

      <main className="flex-1 px-2 sm:px-4 md:px-6 py-4">
        {mode === "cargo" && (
          <CargoView
            pls={safePls}
            setPls={(updater) =>
              setPls((prev) =>
                sanitizePls(typeof updater === "function" ? updater(prev) : updater)
              )
            }
            cons={cons}
            setCons={setCons}
            openPLId={openPLId}
            onConsumeOpenPL={() => setOpenPLId(null)}
            clients={clients}
            currentUser={currentUser}
            setClients={setClients}
            api={{
              createClient,
              createPL,
              updatePL: handleUpdatePL,
              deletePL: handleDeletePL,
            }}
            // ← пробрасываем переход к конкретному клиенту
            goToClients={(clientId /*, clientName */) => {
              setMode("clients");
              // даём рендеру переключить вкладку и только потом передаём id
              setTimeout(() => {
                setOpenClientId(clientId || null);
              }, 50);
            }}
          />
        )}

        {mode === "clients" && (
          <ClientsView
            pls={safePls}
            clients={clients}
            openClientId={openClientId}
            onConsumeOpenClient={() => setOpenClientId(null)}
            onOpenPL={(id) => {
              setMode("cargo");
              setOpenPLId(id);
            }}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
          />
        )}

        {mode === "logistics" && <LogisticsView />}
        {mode === "analytics" && <AnalyticsPage />}
      </main>

      <Footer />

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* Employees Modal (admin only) */}
      {showEmployees && currentUser?.role === 'admin' && (
        <EmployeesModal
          onClose={() => setShowEmployees(false)}
        />
      )}
    </div>
  );
}