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

export default function App() {
  const [route, setRoute] = useState("login");
  return route === "login" ? (
    <LoginScreen onLogin={() => setRoute("app")} />
  ) : (
    <MainApp />
  );
}

function MainApp() {
  const [pls, setPls] = useState([]);
  const [clients, setClients] = useState([]);
  const [cons, setCons] = useState([]);
  const [loading, setLoading] = useState(true);

  // active таб
  const [mode, setMode] = useState("cargo");
  // если нужно открыть конкретный PL из ClientsView
  const [openPLId, setOpenPLId] = useState(null);

  // первичная загрузка
  useEffect(() => {
    async function loadData() {
      try {
        const [plData, clientData] = await Promise.all([getPL(), getClients()]);
        setPls(plData || []);
        setClients(clientData || []);
      } catch (e) {
        console.error("Ошибка загрузки с API:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // добавление клиента (кнопка в ClientsView)
  async function handleAddClient(newClient) {
    try {
      const saved = await createClient(newClient);
      setClients((prev) => [...prev, saved]);
    } catch (err) {
      console.error("Ошибка при создании клиента:", err);
      alert("Не удалось сохранить клиента");
    }
  }

  // обновление PL через API
  async function handleUpdatePL(id, patch) {
    try {
      const updated = await updatePL(id, patch);
      setPls((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error("Ошибка при обновлении PL:", err);
      alert("Не удалось обновить PL");
    }
  }

  // удаление PL через API
  async function handleDeletePL(id) {
    try {
      await deletePL(id);
      setPls((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Ошибка при удалении PL:", err);
      alert("Не удалось удалить PL");
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#FAF3DD] flex flex-col">
      <Header mode={mode} onChangeMode={setMode} />

      <main className="flex-1 px-2 sm:px-4 md:px-6 py-4">
        {mode === "cargo" && (
          <CargoView
            pls={pls}
            setPls={setPls}
            cons={cons}
            setCons={setCons}
            warehouses={demoWarehouses}
            openPLId={openPLId}
            onConsumeOpenPL={() => setOpenPLId(null)}
            clients={clients}
            setClients={setClients}
            api={{
              createClient,
              createPL,
              updatePL: handleUpdatePL,
              deletePL: handleDeletePL,
            }}
          />
        )}

        {mode === "clients" && (
          <ClientsView
            pls={pls}
            clients={clients}
            onOpenPL={(id) => {
              setMode("cargo");
              setOpenPLId(id);
            }}
            onAddClient={handleAddClient}
          />
        )}

        {mode === "warehouses" && (
          <WarehousesView pls={pls} warehouses={demoWarehouses} />
        )}

        {mode === "logistics" && <LogisticsView />}

      </main>

      <Footer />
    </div>
  );
}