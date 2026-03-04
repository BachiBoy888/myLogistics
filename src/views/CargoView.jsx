// src/views/CargoView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PLCard from "../components/PLCard.jsx";

// UI
import Chip from "../components/ui/Chip.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import Card from "../components/ui/Card.jsx";
import Label from "../components/ui/Label.jsx";
import LabelInput from "../components/ui/LabelInput.jsx";
import ToggleChip from "../components/ui/ToggleChip.jsx";
import KV from "../components/ui/KV.jsx";
import NewPLModal from "../components/pl/NewPLModal.jsx";

// Части карточки PL
import DocsList from "../components/pl/DocsList.jsx";

// API (фолбэк, если пропом не передали)
import {
  listConsolidations as apiListCons,
  createConsolidation as apiCreateCons,
  updateConsolidation as apiUpdateCons,
  deleteConsolidation as apiDeleteCons,
  setConsolidationPLs as apiSetConsPLs,
  listPLDocs as apiListPLDocs,
  assignPLResponsible,
  resolveOrCreateClient,                 
} from "../api/client";

// Вынесенные модалки консолидаций
import ConsolidationCreateModal from "../components/consolidation/ConsolidationCreateModal.jsx";
import ConsolidationDetailsModal from "../components/consolidation/ConsolidationDetailsModal.jsx";

// Kanban компоненты
import KanbanBoard from "../components/kanban/KanbanBoard.jsx";
import KanbanColumn from "../components/kanban/KanbanColumn.jsx";
import KanbanPLCard from "../components/kanban/KanbanPLCard.jsx";
import KanbanConsCard from "../components/kanban/KanbanConsCard.jsx";

// Drawer
import SummaryDrawer from "../components/cargo/SummaryDrawer.jsx";

// Константы/утилиты (ЕДИНЫЙ источник правды)
import {
  Statuses,
  humanStatus,
  badgeColorByStatus,
  StageLabels,
  OrderedStages,
  stageOf,
  nextStatusOf,
  nextStageLabelOf,
  humanConsStatus,
  badgeColorByConsStatus,
  consNextStatusOf,
} from "../constants/statuses.js";

import {
  readinessForPL,
  canAllowToShip,
  requirementsResult,
} from "../utils/readiness.js";

// Иконки
import {
  Package,
  Search,
  PlusCircle,
  ChevronRight,
} from "lucide-react";

// Локальный uid
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2, 10);

/* ===========================
   Вью: Мои грузы
=========================== */
export default function CargoView({
  pls,
  setPls,
  cons,
  setCons,
  warehouses,
  openPLId,
  onConsumeOpenPL,
  clients,
  setClients,
  api,
  currentUser,              
  goToClients
}) {
  // --- API c фолбэками ---
  const API = {
    listPLs: api?.fetchPLs || api?.listPLs,
    createPL: api?.createPL,
    updatePL: api?.updatePL,
    deletePL: api?.deletePL,
    createClient: api?.createClient,

    listCons: api?.fetchCons || api?.listCons || apiListCons,
    createCons: api?.createConsolidation || apiCreateCons,
    updateCons: api?.updateConsolidation || apiUpdateCons,
    deleteCons: api?.deleteConsolidation || apiDeleteCons,

    setConsPLs: api?.setConsolidationPLs || apiSetConsPLs,
    listPLDocs: api?.listPLDocs || apiListPLDocs,
  };

  // --- UI состояния
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consOnly, setConsOnly] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(
    (Array.isArray(pls) ? pls.filter(Boolean) : []).find(
      (p) => (p?.status ?? "draft") !== "closed"
    )?.id ?? null
  );

  // ===== Helpers: рефрешы с бэка =====
  async function refreshPLs({ keepSelected = true } = {}) {
    try {
      if (!API.listPLs) return;
      const list = await API.listPLs();
      const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
      setPls(safeList);
      hydrateDocsFor(safeList, { limit: 30 });
      if (keepSelected && selectedId) {
        const exists = safeList.some((p) => p?.id === selectedId);
        if (!exists) setSelectedId(null);
      }
    } catch (e) {
      console.error("Не удалось обновить список PL:", e);
    }
  }

  async function refreshCons() {
    try {
      const list = await API.listCons();
      setCons(Array.isArray(list) ? list.filter(Boolean) : []);
    } catch (e) {
      console.error("Не удалось обновить список консолидаций:", e);
    }
  }

  // нормализация входных
  const safePLs = useMemo(() => {
    const arr = Array.isArray(pls) ? pls.filter(Boolean) : [];
    return arr.map((p) => ({
      ...p,
      status: p?.status ?? "draft",
      id: p?.id ?? null,
      pl_number: String(p?.pl_number ?? p?.plNumber ?? "" ?? ""), // строка
      title: p?.title ?? p?.name ?? "Без названия",
    }));
  }, [pls]);

  const safeCons = useMemo(() => {
    const arr = Array.isArray(cons) ? cons.filter(Boolean) : [];
    return arr.map((c) => ({
      ...c,
      status: c?.status ?? "to_load",
      pl_ids: Array.isArray(c?.pl_ids) ? c.pl_ids.filter(Boolean) : [],
    }));
  }, [cons]);

  // открытие PL извне
  useEffect(() => {
    if (openPLId) {
      setSelectedId(openPLId);
      onConsumeOpenPL?.();
    }
  }, [openPLId, onConsumeOpenPL]);

  // первичные загрузки
  useEffect(() => {
    refreshCons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    refreshPLs({ keepSelected: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // имя клиента
  const clientNameOf = (pl) =>
    typeof pl?.client === "string"
      ? pl.client
      : pl?.client?.name || pl?.client_name || "";

  // список клиентов для модалки
  const clientOptions = useMemo(() => {
    const s = new Set(safePLs.map((p) => clientNameOf(p)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [safePLs]);

  // === Поиск/фильтр ===
  function norm(str = "") {
    return String(str).toLowerCase().trim();
  }
  function normCompact(str = "") {
    return norm(str).replace(/[\s-_/\\.]+/g, "");
  }

  const filtered = useMemo(() => {
    const q = norm(query);
    const qCompact = normCompact(query);

    return safePLs
      .filter((p) => (p?.status ?? "draft") !== "closed")
      .filter((p) => {
        const name = clientNameOf(p);
        const num = p.pl_number || "";
        const haystack = norm(`${num} ${name} ${p.title}`);
        const hayCompact = normCompact(`${num}`);

        const matchesQuery =
          !q ||
          haystack.includes(q) ||
          (qCompact && hayCompact.includes(qCompact));

        const matchesStatus =
          statusFilter === "all"
            ? true
            : norm(p?.status ?? "draft") === norm(statusFilter);

        return matchesQuery && matchesStatus;
      });
  }, [safePLs, query, statusFilter]);

  // догрузка доков для видимых
  const hydratedDocsRef = useRef(new Set());
  async function hydrateDocsFor(plArray, { limit = 30 } = {}) {
    const toFetch = (plArray || [])
      .filter(Boolean)
      .filter((p) => p?.id && !hydratedDocsRef.current.has(p.id))
      .slice(0, limit);

    for (const pl of toFetch) {
      try {
        const docs = await API.listPLDocs(pl.id);
        hydratedDocsRef.current.add(pl.id);
        setPls((prev) =>
          (Array.isArray(prev) ? prev : []).map((x) =>
            x?.id === pl.id ? { ...x, docs } : x
          )
        );
      } catch (e) {
        console.debug("hydrate docs failed for PL", pl.id, e);
      }
    }
  }
  useEffect(() => {
    if (filtered.length) hydrateDocsFor(filtered, { limit: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // активные консолидации: множество PL-идов
  const ACTIVE_CONS_STATUSES = new Set([
    "to_load",
    "loaded",
    "to_customs",
    "released",
    "kg_customs",
    "delivered",
  ]);
  const activeConsPLIds = useMemo(() => {
    const s = new Set();
    safeCons.forEach((c) => {
      if (ACTIVE_CONS_STATUSES.has(c.status)) {
        (c.pl_ids || []).forEach((id) => s.add(id));
      }
    });
    return s;
  }, [safeCons]);

  // группировка PL по этапам (исключая уже в активных консолидациях)
  const groupedByStage = useMemo(() => {
    const groups = OrderedStages.reduce((acc, k) => ((acc[k] = []), acc), {});
    filtered
      .filter((pl) => !activeConsPLIds.has(pl.id))
      .forEach((pl) => {
        const st = stageOf(pl?.status ?? "draft");
        if (groups[st]) groups[st].push(pl);
      });
    return groups;
  }, [filtered, activeConsPLIds]);

  // Для «Погрузка»
  const plsLoading = useMemo(
    () =>
      filtered.filter((p) =>
        ["to_load", "loaded"].includes(p?.status ?? "draft")
      ),
    [filtered]
  );
  const plToCons = useMemo(() => {
    const m = new Map();
    safeCons.forEach((c) => c.pl_ids.forEach((id) => m.set(id, c.id)));
    return m;
  }, [safeCons]);
  const notConsolidatedPLs = useMemo(
    () => plsLoading.filter((p) => !plToCons.has(p.id)),
    [plsLoading, plToCons]
  );

  // консолидации по этапам
  const consByStage = useMemo(() => {
    const m = OrderedStages.reduce((acc, k) => ((acc[k] = []), acc), {});
    safeCons.forEach((c) => {
      const st = stageOf(c?.status ?? "to_load");
      if (m[st]) m[st].push(c);
    });
    return m;
  }, [safeCons]);

  // Stats for SummaryDrawer
  const stats = useMemo(() => {
    const total = safePLs.length;
    const closedCount = safePLs.filter(p => ["closed", "cancelled"].includes(p.status)).length;
    const activeCount = total - closedCount;
    
    // Calculate average progress
    const progressSum = safePLs.reduce((sum, pl) => {
      const stageIdx = OrderedStages.indexOf(stageOf(pl.status));
      const progress = Math.round((stageIdx / (OrderedStages.length - 1)) * 100);
      return sum + progress;
    }, 0);
    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

    // Stage breakdown
    const stageBreakdown = OrderedStages.map((stage) => {
      const count = (groupedByStage[stage] || []).length;
      const label = StageLabels[stage];
      // Get color from badgeColorByStatus for a representative status of this stage
      const repStatus = {
        intake: "draft",
        collect_docs: "awaiting_docs",
        collect_cargo: "awaiting_load",
        loading: "to_load",
        cn_formalities: "to_customs",
        in_transit: "released",
        kg_customs: "kg_customs",
        payment: "collect_payment",
        closed_stage: "closed",
      }[stage];
      const color = repStatus ? badgeColorByStatus(repStatus).split(" ")[0] : "bg-gray-400";
      return { stage, label, count, color };
    });

    return { total, activeCount, closedCount, avgProgress, stageBreakdown };
  }, [safePLs, groupedByStage]);

  const selected = useMemo(
    () => safePLs.find((p) => p.id === selectedId) ?? null,
    [safePLs, selectedId]
  );

  // локальное обновление в стейте
  function updatePLLocal(id, patch) {
    setPls((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) =>
        p?.id === id
          ? { ...p, ...patch, updated_at: new Date().toISOString() }
          : p
      )
    );
  }

  // === Патчи, не требующие PUT на сервер ===
  const isLocalOnlyPatch = (patch) =>
    patch && (Object.prototype.hasOwnProperty.call(patch, "comments")
           || Object.prototype.hasOwnProperty.call(patch, "docs"));

  // серверное сохранение + синк локального стейта
  async function savePLPatch(id, patch) {
    // 1) Локальные патчи (comments/docs) — без запроса к серверу
    if (isLocalOnlyPatch(patch)) {
      updatePLLocal(id, patch);
      setSelectedId(id); // держим карточку открытой
      return;
    }

    // 2) Остальное — шлём на сервер
    try {
      const updated = await API.updatePL(id, patch);
      setPls((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          p?.id === id
            // если сервер вернул пусто (204) — не удаляем PL, а мержим локальный патч
            ? (updated ?? { ...p, ...patch, updated_at: new Date().toISOString() })
            : p
        )
      );
      setSelectedId(id); // оставляем карточку открытой
    } catch (e) {
      console.error("Ошибка при сохранении PL:", e);
      alert("Не удалось сохранить изменения");
      // Подстрахуемся перечиткой (если вдруг что-то разъехалось)
      await refreshPLs({ keepSelected: true });
      setSelectedId(id);
    }
  }

  // ===== Модалки =====
  const [showNew, setShowNew] = useState(false);
  const [showCreateCons, setShowCreateCons] = useState(false);
  const [openConsId, setOpenConsId] = useState(null);

  // Создание PL
async function handleCreatePLFromModal(payload) {
  const {
    client,            // текст из инпута
    client_id,         // id, если выбран из подсказок (может быть null)
    title,
    volume_cbm,
    weight_kg,
    incoterm,
    exw_address,
    fob_wh_id,
    shipper_name,
    shipper_contacts,
  } = payload;

  const clientName = (client || "").trim();
  if (!clientName) {
    alert("Введите клиента перед созданием PL");
    return;
  }

  // 1) Если модалка уже дала нам выбранного клиента — используем его
  let clientRow = null;
  if (client_id) {
    clientRow = (clients || []).find((c) => Number(c.id) === Number(client_id)) || null;
    // если в локальном стейте его ещё нет — минимально добавим-отразим
    if (!clientRow) {
      clientRow = { id: client_id, name: clientName };
      setClients((prev) => [...prev, clientRow]);
    }
  } else {
    // 2) Иначе — пробуем найти точное совпадение или создать нового через API
    try {
      clientRow = await resolveOrCreateClient(clientName);
      if (clientRow && !clients.some((c) => c.id === clientRow.id)) {
        setClients((prev) => [...prev, clientRow]);
      }
    } catch (err) {
      console.error("resolveOrCreateClient failed:", err);
      alert("Не удалось определить/создать клиента");
      return;
    }
  }

  // 3) Адрес забора
  const pickup_address =
    incoterm === "EXW"
      ? (exw_address || "").trim()
      : (() => {
          const wh = warehouses.find((w) => w.id === fob_wh_id);
          return wh ? `${wh.name} • ${wh.address}` : "";
        })();

  // 4) Тело запроса на создание PL
  const body = {
    client_id: clientRow.id,
    title: title?.trim() || "",
    weight_kg: parseFloat(weight_kg) || null,
    volume_cbm: parseFloat(volume_cbm) || null,
    places_qty: 0,
    pickup_address,
    shipper_name: shipper_name?.trim() || "",
    shipper_contacts: shipper_contacts?.trim() || "",
    incoterm,
    fob_warehouse_id: incoterm === "FOB" ? fob_wh_id : null,
    status: "draft",
    docs: [],
    comments: [],
    quote: { calc_cost: null, client_price: null },
  };

  try {
    const saved = await API.createPL(body);

    // авто-назначение создателя ответственным (как было)
    if (currentUser?.id) {
      try {
        await assignPLResponsible(saved.id, currentUser.id);
        setPls((prev) =>
          (Array.isArray(prev) ? prev : []).map((p) =>
            p?.id === saved.id
              ? { ...p, responsible: { id: currentUser.id, name: currentUser.name } }
              : p
          )
        );
      } catch (e) {
        console.debug("self-assign failed (non-blocking):", e);
      }
    }

    setPls((prev) => [saved, ...(Array.isArray(prev) ? prev : [])]);
    setSelectedId(saved.id);
    setShowNew(false);
    await refreshPLs({ keepSelected: true });
  } catch (e) {
    console.error("Ошибка при создании PL:", e);
    alert("Не удалось сохранить PL");
  }
}

  // Удаление PL
  async function handleDeletePL(id) {
    try {
      await API.deletePL(id);
      setPls((prev) =>
        (Array.isArray(prev) ? prev : []).filter((p) => p?.id !== id)
      );
      if (selectedId === id) setSelectedId(null);
      await refreshPLs({ keepSelected: true });
    } catch (err) {
      console.error("Ошибка при удалении PL:", err);
      alert("Не удалось удалить PL");
    }
  }

  // Обновление статуса PL
  async function handleUpdateStatus(id, status) {
    try {
      await API.updatePL(id, { status });
      await refreshPLs({ keepSelected: true });
      setSelectedId(id);
    } catch (err) {
      console.error("Ошибка при обновлении статуса:", err);
      alert("Не удалось обновить статус");
    }
  }

  return (
    <>
      {/*  Шапка с фильтрами */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-800">Мои грузы</span>
              <span className="text-sm text-gray-500">({safePLs.length})</span>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-2 md:justify-end">
              <div className="relative md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  placeholder="Поиск: номер PL, клиент, груз…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                className="border rounded-lg text-sm py-2 px-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={consOnly}
              >
                <option value="all">Все статусы</option>
                {Statuses.map((s) => (
                  <option key={s} value={s}>
                    {humanStatus(s)}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={consOnly}
                  onChange={(e) => setConsOnly(e.target.checked)}
                />
                Только консолидации
              </label>

              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Новый PL
              </button>

              <button
                onClick={() => setSummaryOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Сводка
              </button>
            </div>
          </div>
        </div>
      </header>

      {/*  Kanban Board */}
      <main className="p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {OrderedStages.map((stage) => {
            const stageCons = consByStage[stage] || [];
            const stagePLs = groupedByStage[stage] || [];
            const isLoadingStage = stage === "loading";

            return (
              <div key={stage} className="w-80 flex-shrink-0">
                <div className="bg-gray-100 rounded-xl flex flex-col max-h-[calc(100vh-140px)]">
                  {/*  Column Header */}
                  <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200">
                    <h3 className="font-semibold text-sm text-gray-800">{StageLabels[stage]}</h3>
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                      {stageCons.length + stagePLs.length}
                    </span>
                  </div>

                  {/*  Column Content */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {/*  Create Cons Button (only in Loading stage) */}
                    {isLoadingStage && !consOnly && (
                      <button
                        onClick={() => setShowCreateCons(true)}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Создать консолидацию
                      </button>
                    )}

                    {/*  Consolidations */}
                    {!consOnly && stageCons.map((c) => (
                      <KanbanConsCard
                        key={`cons-${c.id}`}
                        cons={c}
                        onClick={() => setOpenConsId(c.id)}
                        plCount={c.pl_ids?.length || 0}
                      />
                    ))}

                    {/*  PL Cards */}
                    {!consOnly && stagePLs.map((pl) => (
                      <KanbanPLCard
                        key={`pl-${pl.id}`}
                        pl={pl}
                        onClick={() => setSelectedId(pl.id)}
                        clientName={clientNameOf(pl)}
                      />
                    ))}

                    {/*  Cons Only Mode */}
                    {consOnly && stageCons.map((c) => (
                      <KanbanConsCard
                        key={`cons-${c.id}`}
                        cons={c}
                        onClick={() => setOpenConsId(c.id)}
                        plCount={c.pl_ids?.length || 0}
                      />
                    ))}

                    {/*  Empty State */}
                    {stageCons.length === 0 && stagePLs.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Нет грузов
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>{/* PL Detail Modal */}
      {selected && !consOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <PLCard
                pl={selected}
                warehouses={warehouses}
                onUpdate={(patch) => savePLPatch(selected.id, patch)}
                onNext={(newStatus) => handleUpdateStatus(selected.id, newStatus)}
                onDelete={() => handleDeletePL(selected.id)}
                onClose={() => setSelectedId(null)}
                cons={safeCons}
                ui={{ Chip, ProgressBar, Card, Label, LabelInput }}
                helpers={{
                  readinessForPL,
                  canAllowToShip,
                  nextStatusOf,
                  nextStageLabelOf,
                  humanStatus,
                  badgeColorByStatus,
                }}
                navigateToClient={(clientId, clientName) => {
                  setSelectedId(null);
                  goToClients?.(clientId, clientName);
                }}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* Модалки */}    {/* Модалки */}
      {showNew && (
        <NewPLModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreatePLFromModal}
          clientOptions={clientOptions}
          warehouses={warehouses}
        />
      )}

      {showCreateCons && (
        <ConsolidationCreateModal
          onClose={() => setShowCreateCons(false)}
          plsCandidate={notConsolidatedPLs}
          onCreate={async ({ capacity_cbm, capacity_kg, pl_ids }) => {
            try {
              await API.createCons({
                title: `Консолидация`,
                plIds: pl_ids.map(Number),
              });
              setShowCreateCons(false);
              await refreshCons();
            } catch (e) {
              console.error("createConsolidation failed:", e);
              alert("Не удалось создать консолидацию");
            }
          }}
        />
      )}

      {openConsId && (
        <ConsolidationDetailsModal
          cons={safeCons.find((c) => c.id === openConsId)}
          allPLs={safePLs}
          consAll={safeCons}
          onClose={() => setOpenConsId(null)}
          onAdvance={async (c) => {
            const next = consNextStatusOf(c.status);
            if (!next) return;

            const plsOfC = safePLs.filter((p) => c.pl_ids.includes(p.id));
            const rank = (st) => OrderedStages.indexOf(stageOf(st));
            const needUpgrade = plsOfC.filter((p) => rank(p.status) < rank(next));

            try {
              await Promise.all(
                needUpgrade.map((p) => API.updatePL(p.id, { status: next }))
              );
              await API.updateCons(c.id, { status: next });

              setOpenConsId(null);
              setSelectedId(null);
              await Promise.all([refreshPLs(), refreshCons()]);
            } catch (e) {
              console.error("updateConsolidation failed:", e);
              const msg = String(e?.message || "");
              alert(
                msg.includes("Некоторые PL")
                  ? msg
                  : "Не удалось перейти к следующему этапу"
              );
            }
          }}
          onDissolve={async (c) => {
            try {
              await API.deleteCons(c.id);
              setOpenConsId(null);
              await refreshCons();
              await refreshPLs({ keepSelected: true });
            } catch (e) {
              console.error("deleteConsolidation failed:", e);
              alert("Не удалось расформировать консолидацию");
            }
          }}
          onSavePLs={async (id, plIds) => {
            try {
              await API.setConsPLs(id, plIds.map(Number));
              await Promise.all([refreshCons(), refreshPLs()]);
            } catch (e) {
              console.error("setConsolidationPLs failed:", e);
              alert("Не удалось сохранить состав консолидации");
            }
          }}
        />
      )}

      <SummaryDrawer
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        stats={stats}
      />
    </>
  );
}

/* ===========================
   Вспомогательные компоненты
=========================== */

function EmptySummary({ items = [] }) {
  return (
    <div>
      <div className="p-4 border-b">
        <div className="font-medium">Сводка по этапам</div>
      </div>
      <div className="p-4">
        <StageSummary items={items} />
      </div>
    </div>
  );
}

function OnlyConsHint() {
  return (
    <div className="p-6 text-sm text-gray-600">
      Включён режим «Показывать только консолидации». Выберите консолидацию слева, чтобы открыть детали.
    </div>
  );
}

function StageSummary({ items }) {
  const counts = useMemo(() => {
    const map = OrderedStages.reduce((acc, k) => {
      acc[k] = 0;
      return acc;
    }, {});
    (items || [])
      .filter(Boolean)
      .forEach((pl) => {
        const st = stageOf(pl?.status ?? "draft");
        if (map[st] != null) map[st] += 1;
      });
    return map;
  }, [items]);

  const maxVal = useMemo(
    () => Math.max(1, ...OrderedStages.map((k) => counts[k] || 0)),
    [counts]
  );

  return (
    <div className="space-y-3">
      {OrderedStages.map((k) => {
        const value = counts[k] || 0;
        const pct = Math.round((value / maxVal) * 100);
        return (
          <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="text-sm text-gray-700">{StageLabels[k]}</div>
            <div className="min-w-[220px] w-full">
              <div className="relative h-6 rounded-lg bg-gray-100 border">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-black/80"
                  style={{ width: `${pct}%` }}
                />
                <div className="absolute inset-y-0 right-0 pr-2 pl-2 flex items-center justify-end">
                  <span className="text-xs font-medium text-white bg-black rounded px-1.5 py-0.5">
                    {value}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}