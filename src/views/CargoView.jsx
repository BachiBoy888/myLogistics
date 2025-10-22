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
} from "../api/client";

// Вынесенные модалки консолидаций
import ConsolidationCreateModal from "../components/consolidation/ConsolidationCreateModal.jsx";
import ConsolidationDetailsModal from "../components/consolidation/ConsolidationDetailsModal.jsx";

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
  X,
  AlertCircle,
  MapPin,
  Building2,
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
  const [consOnly, setConsOnly] = useState(false); // ✅ новый тумблер
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
      pl_number: String(p?.pl_number ?? p?.plNumber ?? "" ?? ""), // ✅ строка
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

  // === Поиск/фильтр (починено) ===
  function norm(str = "") {
    return String(str).toLowerCase().trim();
  }
  function normCompact(str = "") {
    // без пробелов/дефисов для номеров типа "PL-001 23"
    return norm(str).replace(/[\s-_/\\.]+/g, "");
  }

  const filtered = useMemo(() => {
    const q = norm(query);
    const qCompact = normCompact(query);

    return safePLs
      .filter((p) => (p?.status ?? "draft") !== "closed")
      .filter((p) => {
        // поиск по номеру + клиент + заголовок
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

  const selected = useMemo(
    () => safePLs.find((p) => p.id === selectedId) ?? null,
    [safePLs, selectedId]
  );

  function updatePLLocal(id, patch) {
    setPls((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) =>
        p?.id === id
          ? { ...p, ...patch, updated_at: new Date().toISOString() }
          : p
      )
    );
  }

  // ===== Модалки =====
  const [showNew, setShowNew] = useState(false);
  const [showCreateCons, setShowCreateCons] = useState(false);
  const [openConsId, setOpenConsId] = useState(null);

  // Создание PL
  async function handleCreatePLFromModal(payload) { /* …без изменений… */ 
    const {
      client,
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

    let clientRow =
      (clients || []).find(
        (c) => (c?.name || "").trim().toLowerCase() === clientName.toLowerCase()
      ) || null;

    if (!clientRow) {
      try {
        clientRow = await API.createClient({ name: clientName });
        setClients((prev) => [...prev, clientRow]);
      } catch (err) {
        console.error("Ошибка при создании клиента:", err);
        alert("Не удалось создать клиента");
        return;
      }
    }

    const pickup_address =
      incoterm === "EXW"
        ? (exw_address || "").trim()
        : (() => {
            const wh = warehouses.find((w) => w.id === fob_wh_id);
            return wh ? `${wh.name} • ${wh.address}` : "";
          })();

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
      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Поиск/фильтры */}
        <section className="bg-white rounded-2xl shadow-sm border p-4 lg:col-span-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm min-h-[44px]"
                placeholder="Поиск: номер PL, клиент, груз…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <select
              className="border rounded-lg text-sm py-2 px-2 min-h-[44px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={consOnly} // статусы применимы к PL
              title={consOnly ? "Фильтр по статусам скрыт при консолидациях" : ""}
            >
              <option value="all">Все статусы</option>
              {Statuses.filter((s) => s !== "closed").map((s) => (
                <option key={s} value={s}>
                  {humanStatus(s)}
                </option>
              ))}
            </select>

            {/* ✅ Переключатель «только консолидации» */}
            <label className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={consOnly}
                onChange={(e) => setConsOnly(e.target.checked)}
              />
              Показывать только консолидации
            </label>

            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm min-h-[44px] w-full md:w-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Новый PL
            </button>
          </div>
        </section>

        {/* Левая колонка: этапы */}
        <section className="bg-transparent">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              {consOnly ? "Консолидации по этапам" : "Список PL по этапам"}
            </div>
            {!consOnly && (
              <div className="text-xs text-gray-500">Всего PL: {filtered.length}</div>
            )}
          </div>

          <div className="space-y-3">
            {OrderedStages.map((stage) => (
              <div
                key={stage}
                className="rounded-2xl bg-white shadow-md border border-gray-100"
              >
                {/* Заголовок карточки этапа */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">
                    {StageLabels[stage]}
                  </div>
                  <Chip className="bg-gray-200 text-gray-800">
                    {consOnly
                      ? (consByStage[stage]?.length ?? 0)
                      : (groupedByStage[stage]?.length ?? 0)}
                  </Chip>
                </div>

                {/* Спец-панель «Погрузка» (только когда показываем PL) */}
                {!consOnly && stage === "loading" && (
                  <div className="px-4 pb-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-xs text-gray-600">
                        Не консолидированы: <b>{notConsolidatedPLs.length}</b> •
                        Консолидаций: <b>{consByStage["loading"].length}</b>
                      </div>
                      <button
                        onClick={() => setShowCreateCons(true)}
                        className="inline-flex items-center justify-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-sm min-h-[40px]"
                        disabled={notConsolidatedPLs.length === 0}
                      >
                        <PlusCircle className="w-4 h-4" />
                        Создать консолидацию
                      </button>
                    </div>
                  </div>
                )}

                {/* Консолидации этого этапа */}
                {consByStage[stage]?.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                      Консолидации
                    </div>
                    <div className="space-y-3">
                      {consByStage[stage].map((c) => {
                        const plsOfC = c.pl_ids
                          .map((id) => safePLs.find((p) => p.id === id))
                          .filter(Boolean);
                        const sumW = plsOfC.reduce(
                          (a, p) => a + (p.weight_kg || 0),
                          0
                        );
                        const sumV = plsOfC.reduce(
                          (a, p) => a + (p.volume_cbm || 0),
                          0
                        );
                        const overW =
                          c.capacity_kg > 0 && sumW > c.capacity_kg;
                        const overV =
                          c.capacity_cbm > 0 && sumV > c.capacity_cbm;

                        return (
                          <div key={c.id} className="border rounded-xl">
                            <button
                              onClick={() => setOpenConsId(c.id)}
                              className="w-full text-left p-3 hover:bg-gray-50"
                              title="Открыть консолидацию"
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      {c.number}
                                    </span>
                                    <Chip
                                      className={badgeColorByConsStatus(
                                        c.status
                                      )}
                                    >
                                      {humanConsStatus(c.status)}
                                    </Chip>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    PL: {plsOfC.length} • Вес:{" "}
                                    {sumW.toFixed(2)} кг
                                    {c.capacity_kg
                                      ? ` / ${c.capacity_kg} кг`
                                      : ""}{" "}
                                    • Объём: {sumV.toFixed(2)} м³
                                    {c.capacity_cbm
                                      ? ` / ${c.capacity_cbm} м³`
                                      : ""}
                                  </div>
                                  {(overW || overV) && (
                                    <div className="mt-1 text-xs text-rose-600">
                                      {!overW ? null : "Превышение по весу. "}
                                      {!overV ? null : "Превышение по объёму."}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </button>

                            {/* мини-список PL внутри */}
                            {!consOnly && (
                              <div className="px-3 pb-3">
                                <div className="divide-y rounded-lg border bg-gray-50">
                                  {plsOfC.map((p) => {
                                    const ready = readinessForPL(p);
                                    return (
                                      <button
                                        key={p.id}
                                        className="w-full text-left p-2 hover:bg-gray-100 flex items-center justify-between"
                                        onClick={() => setSelectedId(p.id)}
                                        title="Открыть карточку PL справа"
                                      >
                                        <div className="truncate">
                                          <span className="font-medium">
                                            {p.pl_number}
                                          </span>
                                          <span className="text-gray-600">
                                            {" "}
                                            •{" "}
                                            {typeof p.client === "string"
                                              ? p.client
                                              : p.client?.name || ""}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                          <div className="w-24">
                                            <ProgressBar value={ready} />
                                          </div>
                                          <span>{ready}%</span>
                                          <span>
                                            {p.weight_kg} кг • {p.volume_cbm} м³
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                  {plsOfC.length === 0 && (
                                    <div className="p-2 text-sm text-gray-500">
                                      Пока пусто
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Список PL этого этапа (скрываем, если consOnly) */}
                {!consOnly &&
                  (groupedByStage[stage].length === 0 ? (
                    <div className="px-4 pb-4 text-sm text-gray-400">
                      Нет PL на этой стадии
                    </div>
                  ) : (
                    <div className="px-2 pb-2">
                      <div className="divide-y rounded-xl border bg-white overflow-hidden">
                        {groupedByStage[stage].map((pl) => {
                          const readiness = readinessForPL(pl);
                          return (
                            <button
                              key={pl.id}
                              onClick={() => setSelectedId(pl.id)}
                              className={`w-full text-left p-4 hover:bg-gray-50 ${
                                selectedId === pl.id ? "bg-gray-50" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate">
                                      {pl.pl_number}
                                    </span>
                                    <Chip className={badgeColorByStatus(pl.status)}>
                                      {humanStatus(pl.status)}
                                    </Chip>
                                  </div>
                                  <div className="text-sm text-gray-600 truncate">
                                    {typeof pl.client === "string"
                                      ? pl.client
                                      : pl.client?.name || "—"}{" "}
                                    • {pl.title}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="w-32">
                                      <ProgressBar value={readiness} />
                                    </div>
                                    <span className="text-xs text-gray-600">
                                      {readiness}%
                                    </span>
                                    {canAllowToShip(pl) && (
                                      <Chip className="bg-emerald-100 text-emerald-700">
                                        Готов к выпуску
                                      </Chip>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>

        {/* Правая колонка: карточка PL (прячем, если consOnly) */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {!consOnly ? (
            selected ? (
              <PLCard
                pl={selected}
                warehouses={warehouses}
                onUpdate={(patch) => updatePLLocal(selected.id, patch)}
                onNext={(newStatus) => handleUpdateStatus(selected.id, newStatus)}
                onDelete={() => handleDeletePL(selected.id)}
                onClose={() => setSelectedId(null)}
                cons={safeCons}
                ui={{ Chip, ProgressBar, Card, Label, LabelInput }}
                helpers={{
                  readinessForPL,
                  canAllowToShip,
                  requirementsResult,
                  nextStatusOf,
                  nextStageLabelOf,
                  humanStatus,
                  badgeColorByStatus,
                }}
                
              />
            ) : (
              <EmptySummary items={filtered} />
            )
          ) : (
            <OnlyConsHint />
          )}
        </section>
      </main>

      {/* Модалки */}
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
    </>
  );
}

/* ===========================
   Вспомогательные компоненты
=========================== */

// Вью пустой сводки
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

// Сводка по этапам
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

/* ===== Локальные карточки для PLCard.parts ===== */
// (оставляю без изменений твои CommentsCard / useCostCalculator / CostCalculatorCard)