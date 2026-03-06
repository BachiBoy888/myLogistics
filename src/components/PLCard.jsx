// src/components/PLCard.jsx
// Карточка PL с вкладками (Сведения / Документы / Комментарии / Хронология)
import React, { useState, useMemo, useEffect } from "react";
import CostCalculatorCard from "./CostCalculatorCard.jsx";
import CommentsCard from "./CommentsCard.jsx";
import DocsList from "./pl/DocsList.jsx";
import {
  Package,
  X,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  ClipboardCopy,
  UserCheck,
  Clock,
  ArrowUpRight,
  FileText,
  MessageSquare,
  History,
  Info,
} from "lucide-react";
import { listPLEvents, assignPLResponsible, listUsers } from "../api/client.js";
import { safeEvents } from "../utils/events.js";

const TABS = [
  { id: "info", label: "Сведения", icon: Info },
  { id: "docs", label: "Документы", icon: FileText },
  { id: "comments", label: "Комментарии", icon: MessageSquare },
  { id: "timeline", label: "Хронология", icon: History },
];

export default function PLCard({
  pl,
  onUpdate,
  onClose,
  onDelete,
  warehouses = [],
  cons = [],
  ui,
  helpers,
  currentUser = null,
  navigateToClient = null,
}) {
  const { Chip, Card, LabelInput } = ui;
  const { humanStatus, badgeColorByStatus } = helpers;

  const [activeTab, setActiveTab] = useState("info");
  const [showMenu, setShowMenu] = useState(false);
  const [copiedCargo, setCopiedCargo] = useState(false);

  // ===== Консолидация для PL
  const consOfPL = useMemo(
    () => (cons || []).find((c) => c.pl_ids?.includes(pl.id)) || null,
    [cons, pl.id]
  );

  // ===== Хронология
  const [events, setEvents] = useState([]);
  const [evLoading, setEvLoading] = useState(true);
  const [evError, setEvError] = useState("");

  async function refreshEvents() {
    try {
      setEvError("");
      setEvLoading(true);
      const rows = await listPLEvents(pl.id);
      const sanitized = safeEvents(rows, {
        plId: pl.id,
        logger: (s) =>
          s.dropped > 0 && console.warn("[PLCard] dropped invalid events", pl.id, s),
      });
      setEvents(sanitized);
    } catch (e) {
      setEvError("Не удалось загрузить события");
      console.error("[PLCard] events fetch error", e);
    } finally {
      setEvLoading(false);
    }
  }
  useEffect(() => {
    if (pl?.id) refreshEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pl?.id]);

  // ===== Документы (для каунтера)
  const [docsCount, setDocsCount] = useState(0);
  const handleDocsLoaded = (count) => setDocsCount(count);

  // ===== Комментарии (для каунтера)
  const [commentsCount, setCommentsCount] = useState(0);
  const handleCommentsLoaded = (count) => setCommentsCount(count);

  // ===== Ответственный
  const [showRespPicker, setShowRespPicker] = useState(false);
  const [logists, setLogists] = useState([]);
  const [logistsLoading, setLogistsLoading] = useState(false);
  const [logistsErr, setLogistsErr] = useState("");

  const responsibleName =
    typeof pl?.responsible === "object"
      ? pl.responsible?.name || "Логист"
      : pl?.responsible_name || null;

  const canSelfAssign =
    !!currentUser &&
    (currentUser.role === "admin" ||
      currentUser.role === "logist" ||
      currentUser.role === "логист");

  async function handleSelfAssign() {
    if (!currentUser?.id) return;
    try {
      const saved = await assignPLResponsible(pl.id, currentUser.id);
      onUpdate?.({
        responsible: saved?.responsible ?? {
          id: currentUser.id,
          name: currentUser.name,
        },
      });
      refreshEvents();
    } catch (e) {
      try {
        await onUpdate?.({ responsible_user_id: currentUser.id });
        refreshEvents();
      } catch {
        alert("Не удалось назначить ответственного");
      }
    }
  }

  async function ensureLogistsLoaded() {
    if (logists.length || logistsLoading) return;
    try {
      setLogistsErr("");
      setLogistsLoading(true);
      const rows = await listUsers({ role: "logist" });
      const arr = (Array.isArray(rows) ? rows : [])
        .map((u) => ({
          id: u.id ?? u.user_id ?? u._id,
          name: u.name ?? u.fullName ?? u.login ?? "Логист",
          role: u.role ?? u.user_role ?? "logist",
        }))
        .filter((u) => u.id);
      setLogists(arr);
    } catch (e) {
      console.error(e);
      setLogistsErr("Не удалось получить список логистов (эндпоинт /users).");
      setLogists([]);
    } finally {
      setLogistsLoading(false);
    }
  }

  // ===== Копирование инфо
  const copyCargoInfo = () => {
    const text = [
      `${pl.pl_number ?? ""}`,
      `Load: ${pl.title ?? ""}`,
      `Volume, м³: ${pl.volume_cbm ?? ""}`,
      `Weight, kg: ${pl.weight_kg ?? ""}`,
      `Places: ${pl.places ?? 1}`,
      `Sender: ${pl.shipper_name ?? ""}`,
      `Sender address: ${pl.pickup_address ?? ""}`,
      `Contact info: ${pl.shipper_contacts ?? ""}`,
    ].join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedCargo(true);
        setTimeout(() => setCopiedCargo(false), 1500);
      })
      .catch((e) => console.error("Не удалось скопировать", e));
  };

  async function handleSaveQuote(calcCost, clientPrice) {
    try {
      await onUpdate({
        quote: { calc_cost: Number(calcCost) || 0, client_price: Number(clientPrice) || 0 },
      });
    } catch (err) {
      console.error("Ошибка при сохранении цены:", err);
      alert("Не удалось сохранить стоимость");
    }
  }

  const clientName =
    typeof pl?.client === "string"
      ? pl.client
      : pl?.client?.name || pl?.client_name || "—";

  // Получаем счётчики для табов
  const getTabCount = (tabId) => {
    switch (tabId) {
      case "docs":
        return docsCount;
      case "comments":
        return commentsCount;
      case "timeline":
        return events.filter(Boolean).length;
      default:
        return null;
    }
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col max-h-[90vh]">
      {/* Верхняя плашка: Клиент */}
      <div className="px-3 py-2 bg-gray-50 border-b text-sm flex items-center gap-2">
        <span className="text-gray-600">Клиент:</span>
        {navigateToClient ? (
          <button
            type="button"
            onClick={() => navigateToClient(pl?.client?.id, clientName)}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 underline underline-offset-2"
            title="Открыть карточку клиента"
          >
            <span className="font-medium truncate">{clientName}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="font-medium">{clientName}</span>
        )}
      </div>

      {/* Заголовок */}
      <div className="p-3 border-b flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h2 className="font-semibold text-lg">{pl.pl_number || "Черновик"}</h2>
            <Chip className={badgeColorByStatus(pl.status)}>{humanStatus(pl.status)}</Chip>
          </div>
          <div className="text-sm text-gray-600 mt-0.5">
            {clientName} • {pl.title || "Без названия"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="p-2 border rounded-lg hover:bg-gray-50"
              onClick={() => setShowMenu((v) => !v)}
              title="Меню действий"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 w-44">
                <button
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-sm text-rose-600 hover:bg-rose-50 rounded-lg"
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm("Удалить этот PL безвозвратно?")) onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить PL
                </button>
              </div>
            )}
          </div>

          <button className="p-2 border rounded-lg hover:bg-gray-50" title="Закрыть карточку" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="border-b bg-gray-50">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {count !== null && count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент вкладок */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-100">
        {/* Вкладка Сведения */}
        {activeTab === "info" && (
          <div className="space-y-3">
            {/* В консолидации */}
            {consOfPL && (
              <div className="px-3 py-2 bg-violet-50 border rounded-lg text-sm">
                В консолидации: <b>{consOfPL.number}</b>
              </div>
            )}

            {/* Груз + Забор + Ответственный */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Груз */}
              <Card title="Груз" className="bg-white p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <LabelInput label="Название" value={pl.title ?? ""} onChange={(v) => onUpdate({ title: v })} />
                  <LabelInput
                    type="number"
                    label="Вес, кг"
                    value={pl.weight_kg ?? ""}
                    onChange={(v) => onUpdate({ weight_kg: parseFloat(v || 0) })}
                  />
                  <LabelInput
                    type="number"
                    label="Объём, м³"
                    value={pl.volume_cbm ?? ""}
                    onChange={(v) => onUpdate({ volume_cbm: parseFloat(v || 0) })}
                  />
                  <LabelInput
                    type="number"
                    label="Количество мест"
                    value={pl.places ?? ""}
                    min="1"
                    onChange={(v) => onUpdate({ places: parseInt(v || 1, 10) })}
                  />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button onClick={copyCargoInfo} className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-sm">
                    <ClipboardCopy className="w-4 h-4" />
                    Скопировать
                  </button>
                  {copiedCargo && (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Скопировано
                    </span>
                  )}
                </div>
              </Card>

              {/* Забор */}
              <Card title="Забор" className="bg-white p-3">
                <div className="flex flex-col gap-2 text-sm">
                  <LabelInput
                    label="Адрес забора"
                    value={pl.pickup_address ?? ""}
                    onChange={(v) => onUpdate({ pickup_address: v })}
                  />
                  <LabelInput
                    label="Отправитель"
                    value={pl.shipper_name ?? ""}
                    onChange={(v) => onUpdate({ shipper_name: v })}
                  />
                  <LabelInput
                    label="Контакты"
                    value={pl.shipper_contacts ?? ""}
                    onChange={(v) => onUpdate({ shipper_contacts: v })}
                  />
                </div>
              </Card>

              {/* Ответственный */}
              <Card title="Ответственный" className="bg-white p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Назначен</div>
                    <div className="font-medium truncate">{responsibleName || "— не назначен —"}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canSelfAssign && (
                      <button
                        type="button"
                        onClick={handleSelfAssign}
                        className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50"
                        title="Назначить себя ответственным"
                      >
                        <UserCheck className="w-4 h-4" />
                        Я
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setShowRespPicker(true);
                        await ensureLogistsLoaded();
                      }}
                      className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50"
                      title="Выбрать из списка"
                    >
                      Выбрать…
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Калькулятор */}
            <div className="rounded-2xl bg-white shadow-sm border p-3">
              <h3 className="font-semibold mb-2">Калькулятор себестоимости</h3>
              <CostCalculatorCard pl={pl} onSave={handleSaveQuote} />
            </div>
          </div>
        )}

        {/* Вкладка Документы */}
        {activeTab === "docs" && (
          <div className="rounded-2xl bg-white shadow-sm border p-3">
            <DocsList pl={pl} onUpdate={onUpdate} onCountLoaded={handleDocsLoaded} />
          </div>
        )}

        {/* Вкладка Комментарии */}
        {activeTab === "comments" && (
          <div className="rounded-2xl bg-white shadow-sm border p-3">
            <CommentsCard
              pl={pl}
              onAppend={(created) => {
                const next = [...(pl.comments || []), created];
                onUpdate({ comments: next });
                refreshEvents();
                setCommentsCount((c) => c + 1);
              }}
              onCountLoaded={handleCommentsLoaded}
            />
          </div>
        )}

        {/* Вкладка Хронология */}
        {activeTab === "timeline" && (
          <div className="rounded-2xl bg-white shadow-sm border p-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <h3 className="font-semibold">События</h3>
              <span className="text-sm text-gray-500">({events.filter(Boolean).length})</span>
            </div>

            {evLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : evError ? (
              <div className="text-sm text-rose-600">{evError}</div>
            ) : (events || []).filter(Boolean).length === 0 ? (
              <div className="text-sm text-gray-500">Пока событий нет</div>
            ) : (
              <ul className="divide-y text-[13px]">
                {(events || [])
                  .filter((e) => e && (e.id != null || e.type))
                  .map((e, i) => {
                    const key = e.id ?? `${e.type || "evt"}-${pl?.id ?? "x"}-${i}`;
                    const when = e.createdAt || e.created_at || e.at;
                    const userName = typeof e.user === "object" ? e.user?.name ?? "" : e.user ?? "";
                    return (
                      <li key={key} className="py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{e.title || e.type || "Событие"}</div>
                          {e.details && <div className="text-gray-600 whitespace-pre-wrap break-words">{e.details}</div>}
                          {userName && <div className="text-xs text-gray-500 mt-0.5">{userName}</div>}
                        </div>
                        <div className="shrink-0 text-xs text-gray-500">{when ? new Date(when).toLocaleString() : ""}</div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Модалка выбора логиста */}
      {showRespPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRespPicker(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Выберите логиста</div>
              <button className="px-2 py-1 border rounded-lg" onClick={() => setShowRespPicker(false)}>
                Закрыть
              </button>
            </div>

            {logistsLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : logistsErr ? (
              <div className="space-y-3">
                <div className="text-sm text-rose-600">{logistsErr}</div>
                {canSelfAssign && (
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50"
                    onClick={async () => {
                      await handleSelfAssign();
                      setShowRespPicker(false);
                    }}
                  >
                    <UserCheck className="w-4 h-4" />
                    Назначить меня
                  </button>
                )}
              </div>
            ) : (logists || []).length === 0 ? (
              <div className="text-sm text-gray-500">Нет доступных логистов</div>
            ) : (
              <div className="max-h-72 overflow-auto divide-y rounded-lg border">
                {logists.map((u) => (
                  <button
                    key={u.id}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        await assignPLResponsible(pl.id, u.id);
                        onUpdate?.({ responsible: { id: u.id, name: u.name } });
                        setShowRespPicker(false);
                        refreshEvents();
                      } catch {
                        alert("Не удалось назначить ответственного");
                      }
                    }}
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.role}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
