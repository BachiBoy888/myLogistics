// src/views/ClientsView.jsx
import React, { useMemo, useState } from "react";
import Chip from "../components/ui/Chip.jsx";
import Card from "../components/ui/Card.jsx";

import { Users, ChevronRight } from "lucide-react";

import {
  OrderedStages,
  StageLabels,
  stageOf,
  humanStatus,
} from "../constants/statuses.js";

export default function ClientsView({ pls, clients = [], onOpenPL, onAddClient }) {
  // безопасно получить имя клиента из PL: строка или объект
  const clientNameOf = (pl) =>
    typeof pl?.client === "string"
      ? pl.client
      : (pl?.client?.name || pl?.client_name || "—");

  // собираем единую витрину клиентов: из props.clients + из всех PL
  const clientList = useMemo(() => {
    const map = new Map();

    // 1) явные клиенты из справочника
    for (const c of clients) {
      const name = (c?.name || "").trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, { name, pls: [] });
    }

    // 2) клиенты, встречающиеся в PL
    for (const pl of pls) {
      const key = (clientNameOf(pl) || "—").trim() || "—";
      if (!map.has(key)) map.set(key, { name: key, pls: [] });
      map.get(key).pls.push(pl);
    }

    // алфавит по-русски
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    );
  }, [clients, pls]);

  const [selClientName, setSelClientName] = useState(clientList[0]?.name ?? null);
  const selClient = clientList.find((c) => c.name === selClientName) || null;

  // агрегаты по выбранному клиенту
  const sumClient = (selClient?.pls || []).reduce(
    (acc, pl) => acc + (pl.quote?.client_price || 0),
    0
  );

  const byStage = (selClient?.pls || []).reduce((acc, pl) => {
    const st = stageOf(pl.status);
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const inWork = (selClient?.pls || []).filter((pl) =>
    [
      "draft",
      "awaiting_docs",
      "to_load",
      "loaded",
      "to_customs",
      "released",
      "kg_customs",
      "delivered",
    ].includes(pl.status)
  ).length;

  return (
    <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Левая колонка: список клиентов */}
      <section className="bg-white rounded-2xl shadow-sm border">
        <div className="p-4 flex items-center justify-between">
          <div className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Список клиентов
          </div>
          <div className="text-xs text-gray-500">Всего: {clientList.length}</div>
        </div>

        <div className="px-4 pb-2">
          <button
            onClick={() => {
              const name = prompt("Введите название клиента:");
              if (!name?.trim()) return;
              onAddClient?.({ name: name.trim() });
            }}
            className="w-full bg-black text-white rounded-lg px-3 py-2 text-sm mt-2"
          >
            + Добавить клиента
          </button>
        </div>

        <div className="divide-y">
          {clientList.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelClientName(c.name)}
              className={`w-full text-left p-4 hover:bg-gray-50 ${
                selClientName === c.name ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-gray-600">PL: {c.pls.length}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}

          {clientList.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              Клиентов пока нет
            </div>
          )}
        </div>
      </section>

      {/* Правая колонка: сводка по выбранному клиенту */}
      <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {selClient ? (
          <div>
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">{selClient.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                PL: {selClient.pls.length} • На сумму: ${sumClient}
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Распределение по этапам">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {OrderedStages.map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600">{StageLabels[key]}</span>
                      <span className="font-medium">{byStage[key] || 0}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="В работе">
                <div className="text-2xl font-semibold">{inWork}</div>
              </Card>

              <Card title="Список PL">
                <div className="divide-y">
                  {selClient.pls.map((pl) => (
                    <button
                      key={pl.id}
                      className="w-full text-left py-2 hover:bg-gray-50 px-2 rounded-md"
                      onClick={() => onOpenPL?.(pl.id)}
                      title="Открыть карточку PL справа"
                    >
                      <div className="font-medium truncate">
                        {pl.pl_number} — {pl.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {humanStatus(pl.status)} • ${pl.quote?.client_price || 0}
                      </div>
                    </button>
                  ))}
                  {selClient.pls.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">PL не найдено</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">Выберите клиента из списка</div>
        )}
      </section>
    </main>
  );
}