// src/components/PLCard.jsx
// Карточка PL с вкладками (Сведения / Документы / Комментарии / Хронология)
import React, { useState, useMemo, useEffect, useCallback } from "react";
import PLCostSummary from "./pl/PLCostSummary.jsx";
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
  UserCog,
} from "lucide-react";
import { listPLEvents, assignPLResponsible, listUsers, listPLDocs, listPLComments, updatePL } from "../api/client.js";
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

  // ===== Локальное состояние формы (чтобы не сбрасывалось при вводе)
  const [formData, setFormData] = useState({
    title: pl.title ?? "",
    weight_kg: pl.weight_kg ?? "",
    volume_cbm: pl.volume_cbm ?? "",
    places: pl.places ?? 1,
    pickup_address: pl.pickup_address ?? "",
    shipper_name: pl.shipper_name ?? "",
    shipper_contacts: pl.shipper_contacts ?? "",
  });

  // Обновляем formData когда меняется pl - синхронизируем все поля включая consolidation-данные
  useEffect(() => {
    setFormData({
      title: pl.title ?? "",
      weight_kg: pl.weight_kg ?? "",
      volume_cbm: pl.volume_cbm ?? "",
      places: pl.places ?? 1,
      pickup_address: pl.pickup_address ?? "",
      shipper_name: pl.shipper_name ?? "",
      shipper_contacts: pl.shipper_contacts ?? "",
    });
    // Reset tab to info when opening different PL
    setActiveTab("info");
    // Reset menu state
    setShowMenu(false);
  }, [pl.id, pl.effective_leg2_usd, pl.leg2_manual_amount_usd]);

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

  // ===== Документы и комментарии - загружаем сразу для каунтеров
  const [docsCount, setDocsCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  // Загружаем счётчики сразу при открытии PL
  useEffect(() => {
    if (!pl?.id) return;
    
    // Загружаем документы
    listPLDocs(pl.id).then(list => {
      setDocsCount(Array.isArray(list) ? list.length : 0);
    }).catch(() => setDocsCount(0));
    
    // Загружаем комментарии
    listPLComments(pl.id).then(rows => {
      setCommentsCount(Array.isArray(rows) ? rows.length : 0);
    }).catch(() => setCommentsCount(0));
  }, [pl?.id]);

  // ===== Ответственный
  const [showRespPicker, setShowRespPicker] = useState(false);
  const [logists, setLogists] = useState([]);
  const [logistsLoading, setLogistsLoading] = useState(false);
  const [logistsErr, setLogistsErr] = useState("");

  // ===== Смена клиента
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientsList, setClientsList] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Загрузка списка клиентов
  async function loadClientsList() {
    if (clientsList.length || clientsLoading) return;
    try {
      setClientsLoading(true);
      const { getClients } = await import("../api/client.js");
      const rows = await getClients();
      const arr = (Array.isArray(rows) ? rows : [])
        .map((c) => ({
          id: c.id,
          name: c.name || "Без имени",
          company: c.company || "",
        }))
        .filter((c) => c.id)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      setClientsList(arr);
    } catch (e) {
      console.error("[PLCard] failed to load clients", e);
    } finally {
      setClientsLoading(false);
    }
  }

  async function handleChangeClient() {
    if (!selectedClientId) return;
    try {
      await updatePL(pl.id, { client_id: selectedClientId });
      onUpdate?.({ client_id: selectedClientId });
      setShowClientPicker(false);
      // Обновляем страницу чтобы отобразить изменения
      window.location.reload();
    } catch (e) {
      console.error("[PLCard] failed to change client", e);
      alert("Не удалось сменить клиента");
    }
  }

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
        .filter((u) => u.isActive !== false) // только активные логисты
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
      `Load: ${formData.title ?? ""}`,
      `Volume, м³: ${formData.volume_cbm ?? ""}`,
      `Weight, kg: ${formData.weight_kg ?? ""}`,
      `Places: ${formData.places ?? 1}`,
      `Sender: ${formData.shipper_name ?? ""}`,
      `Sender address: ${formData.pickup_address ?? ""}`,
      `Contact info: ${formData.shipper_contacts ?? ""}`,
    ].join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedCargo(true);
        setTimeout(() => setCopiedCargo(false), 1500);
      })
      .catch((e) => console.error("Не удалось скопировать", e));
  };

  // ===== Сохранение по blur
  const handleBlur = useCallback((field, value) => {
    // Проверяем, изменилось ли значение
    const originalValue = pl[field];
    if (value !== originalValue) {
      onUpdate({ [field]: value });
    }
  }, [pl, onUpdate]);

  // ===== Обработчики изменения полей
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ===== Сохранение всех изменений при закрытии
  const handleClose = () => {
    // Сохраняем все изменённые поля
    const updates = {};
    if (formData.title !== pl.title) updates.title = formData.title;
    if (formData.weight_kg !== pl.weight_kg) updates.weight_kg = Number(formData.weight_kg) || 0;
    if (formData.volume_cbm !== pl.volume_cbm) updates.volume_cbm = Number(formData.volume_cbm) || 0;
    if (formData.places !== pl.places) updates.places = Number(formData.places) || 1;
    if (formData.pickup_address !== pl.pickup_address) updates.pickup_address = formData.pickup_address;
    if (formData.shipper_name !== pl.shipper_name) updates.shipper_name = formData.shipper_name;
    if (formData.shipper_contacts !== pl.shipper_contacts) updates.shipper_contacts = formData.shipper_contacts;
    
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    onClose();
  };

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
            {clientName} • {formData.title || "Без названия"}
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
              <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 w-56">
                <button
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-sm hover:bg-gray-50 rounded-lg"
                  onClick={() => {
                    setShowMenu(false);
                    setShowClientPicker(true);
                    loadClientsList();
                  }}
                >
                  <UserCog className="w-4 h-4 text-blue-600" />
                  Сменить клиента
                </button>
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

          <button className="p-2 border rounded-lg hover:bg-gray-50" title="Закрыть карточку" onClick={handleClose}>
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
                  <LabelInput 
                    label="Название" 
                    value={formData.title} 
                    onChange={(v) => handleChange("title", v)}
                    onBlur={() => handleBlur("title", formData.title)}
                  />
                  <NumberInput
                    label="Вес, кг"
                    value={formData.weight_kg}
                    onChange={(v) => handleChange("weight_kg", v)}
                    onBlur={() => handleBlur("weight_kg", Number(formData.weight_kg) || 0)}
                  />
                  <NumberInput
                    label="Объём, м³"
                    value={formData.volume_cbm}
                    onChange={(v) => handleChange("volume_cbm", v)}
                    onBlur={() => handleBlur("volume_cbm", Number(formData.volume_cbm) || 0)}
                  />
                  <NumberInput
                    label="Количество мест"
                    value={formData.places}
                    min="1"
                    onChange={(v) => handleChange("places", v)}
                    onBlur={() => handleBlur("places", Number(formData.places) || 1)}
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
                    value={formData.pickup_address}
                    onChange={(v) => handleChange("pickup_address", v)}
                    onBlur={() => handleBlur("pickup_address", formData.pickup_address)}
                  />
                  <LabelInput
                    label="Отправитель"
                    value={formData.shipper_name}
                    onChange={(v) => handleChange("shipper_name", v)}
                    onBlur={() => handleBlur("shipper_name", formData.shipper_name)}
                  />
                  <LabelInput
                    label="Контакты"
                    value={formData.shipper_contacts}
                    onChange={(v) => handleChange("shipper_contacts", v)}
                    onBlur={() => handleBlur("shipper_contacts", formData.shipper_contacts)}
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
              <PLCostSummary pl={pl} onUpdate={onUpdate} />
            </div>
          </div>
        )}

        {/* Вкладка Документы */}
        {activeTab === "docs" && (
          <div className="rounded-2xl bg-white shadow-sm border p-3">
            <DocsList pl={pl} onUpdate={onUpdate} onCountLoaded={setDocsCount} />
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
              onCountLoaded={setCommentsCount}
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

      {/* Модалка выбора клиента */}
      {showClientPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClientPicker(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Выберите клиента</div>
              <button className="px-2 py-1 border rounded-lg" onClick={() => setShowClientPicker(false)}>
                Закрыть
              </button>
            </div>

            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Текущий клиент:</div>
              <div className="font-medium">{clientName} (ID: {pl?.client?.id || pl?.client_id || '—'})</div>
            </div>

            {clientsLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : clientsList.length === 0 ? (
              <div className="text-sm text-gray-500">Нет доступных клиентов</div>
            ) : (
              <>
                <div className="max-h-72 overflow-auto divide-y rounded-lg border mb-3">
                  {clientsList.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedClientId === c.id ? 'bg-blue-50 border-blue-200' : ''}`}
                      onClick={() => setSelectedClientId(c.id)}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">ID: {c.id}</div>
                    </button>
                  ))}
                </div>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:bg-gray-300"
                  disabled={!selectedClientId || selectedClientId === pl?.client?.id}
                  onClick={handleChangeClient}
                >
                  Переместить к выбранному клиенту
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент для числовых полей без спиннеров
function NumberInput({ label, value, onChange, onBlur, min }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600 text-xs">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        className="w-full border rounded-lg px-3 py-2 h-[40px] mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="0"
      />
    </label>
  );
}
