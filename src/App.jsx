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
  me,
  logout as apiLogout,
} from "./api/client.js";

// UI / каркас
import LoadingScreen from "./components/LoadingScreen.jsx";
import LoginScreen from "./components/auth/LoginScreen.jsx";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";

// Вьюхи
import CargoView from "./views/CargoView.jsx";
import ClientsView from "./views/ClientsView.jsx";
import WarehousesView from "./views/WarehousesView.jsx";
import LogisticsView from "./views/LogisticsView.jsx";

// Константы/данные
import { demoWarehouses } from "./constants/warehouses.js";

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

  // Проверяем сессию при запуске
  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        setBoot({ loading: false, user: u });
      } catch {
        setBoot({ loading: false, user: null });
      }
    })();
  }, []);

  if (boot.loading) return <LoadingScreen />;

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

  // активная вкладка
  const [mode, setMode] = useState("cargo");

  // для открытия конкретных сущностей из других вьюх
  const [openPLId, setOpenPLId] = useState(null);
  const [openClientId, setOpenClientId] = useState(null);

  // первичная загрузка
  useEffect(() => {
    async function loadData() {
      try {
        const [plData, clientData] = await Promise.all([getPL(), getClients()]);
        setPls(sanitizePls(plData));
        setClients(Array.isArray(clientData) ? clientData : []);
      } catch (e) {
        console.error("Ошибка загрузки с API:", e);
        if (String(e?.message || "").includes("401")) onLogout?.();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [onLogout]);

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
    <div className="min-h-screen bg-[#FAF3DD] flex flex-col">
      <Header mode={mode} onChangeMode={setMode} user={user} onLogout={onLogout} />

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
            warehouses={demoWarehouses}
            openPLId={openPLId}
            onConsumeOpenPL={() => setOpenPLId(null)}
            clients={clients}
            currentUser={user}
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
            openClientId={openClientId}                 // ← передаём id клиента для авто-открытия
            onConsumeOpenClient={() => setOpenClientId(null)} // ← сбрасываем после использования
            onOpenPL={(id) => {
              setMode("cargo");
              setOpenPLId(id);
            }}
            onAddClient={handleAddClient}
          />
        )}

        {mode === "warehouses" && (
          <WarehousesView pls={safePls} warehouses={demoWarehouses} />
        )}

        {mode === "logistics" && <LogisticsView />}
      </main>

      <Footer />
    </div>
  );
}