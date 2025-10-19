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

// Части карточки PL
import DocsList from "../components/pl/DocsList.jsx";

// API (фолбэк, если пропом не передали)
import {
  listConsolidations as apiListCons,
  createConsolidation as apiCreateCons,
  updateConsolidation as apiUpdateCons,
  deleteConsolidation as apiDeleteCons,
  setConsolidationPLs as apiSetConsPLs,   // <= добавить
  listPLDocs as apiListPLDocs,
} from "../api/client";

// Вынесенные модалки консолидаций
import ConsolidationCreateModal from "../components/consolidation/ConsolidationCreateModal.jsx";
import ConsolidationDetailsModal from "../components/consolidation/ConsolidationDetailsModal.jsx";

// Константы/утилиты
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

// Локальный uid без зависимостей
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
  api, // { createClient, createPL, updatePL, deletePL, fetchPLs|listPLs, fetchCons|listCons }
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

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(
    (Array.isArray(pls) ? pls.filter(Boolean) : []).find(
      (p) => (p?.status ?? "draft") !== "closed"
    )?.id ?? null
  );

  // ===== Helpers: рефрешы с бэка =====
  async function refreshPLs({ keepSelected = true } = {}) {
    try {
      if (!API.listPLs) return; // если api пропом не передали
      const list = await API.listPLs();
      const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
      setPls(safeList);
      // подгружаем документы для первых N PL, чтобы прогресс был корректный
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

  // ✅ безопасные версии входных данных
  const safePLs = useMemo(() => {
    const arr = Array.isArray(pls) ? pls.filter(Boolean) : [];
    return arr.map((p) => ({
      ...p,
      status: p?.status ?? "draft",
      id: p?.id ?? null,
      pl_number: p?.pl_number ?? p?.plNumber ?? "",
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

  // если пришёл внешний запрос «открыть PL»
  useEffect(() => {
    if (openPLId) {
      setSelectedId(openPLId);
      onConsumeOpenPL?.();
    }
  }, [openPLId, onConsumeOpenPL]);

  // на маунте подтянуть консолидации
  useEffect(() => {
    refreshCons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  refreshPLs({ keepSelected: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);



  // утилита: получить имя клиента для поиска
  const clientNameOf = (pl) =>
    typeof pl?.client === "string"
      ? pl.client
      : pl?.client?.name || pl?.client_name || "";

  // клиентские опции для модалки создания
  const clientOptions = useMemo(() => {
    const s = new Set(safePLs.map((p) => clientNameOf(p)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [safePLs]);

  // фильтр по поиску/статусу (закрытые — скрываем)
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return safePLs
      .filter((p) => (p?.status ?? "draft") !== "closed")
      .filter((p) => {
        const name = clientNameOf(p);
        const haystack = [p.pl_number, name, p.title].join(" ").toLowerCase();
        const mQuery = haystack.includes(q);
        const mStatus =
          statusFilter === "all"
            ? true
            : (p?.status ?? "draft") === statusFilter;
        return mQuery && mStatus;
      });
  }, [safePLs, query, statusFilter]);

  // когда меняется отфильтрованный список, догружаем доки для него (один раз на PL)
useEffect(() => {
  if (filtered.length) hydrateDocsFor(filtered, { limit: 50 });
}, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  // какие статусы консолидаций считаем «живыми»
  const ACTIVE_CONS_STATUSES = new Set([
    "to_load",
    "loaded",
    "to_customs",
    "released",
    "kg_customs",
    "delivered",
  ]);

  // множество id PL, которые уже в активных консолидациях
  const activeConsPLIds = useMemo(() => {
    const s = new Set();
    safeCons.forEach((c) => {
      if (ACTIVE_CONS_STATUSES.has(c.status)) {
        (c.pl_ids || []).forEach((id) => s.add(id));
      }
    });
    return s;
  }, [safeCons]);

  // группировка PL по этапам (исключая те, что уже в активных консолидациях)
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

// какие PL уже гидрировали доками
  const hydratedDocsRef = useRef(new Set());

  async function hydrateDocsFor(plArray, { limit = 30 } = {}) {
    const toFetch = (plArray || [])
      .filter(Boolean)
      .filter(p => p?.id && !hydratedDocsRef.current.has(p.id))
      .slice(0, limit);

    for (const pl of toFetch) {
      try {
        const docs = await API.listPLDocs(pl.id);
        hydratedDocsRef.current.add(pl.id);
        // аккуратно вмерживаем docs в соответствующий PL
        setPls(prev =>
          (Array.isArray(prev) ? prev : []).map(x =>
            x?.id === pl.id ? { ...x, docs } : x
          )
        );
      } catch (e) {
        // тихо пропускаем — прогресс останется как есть
        console.debug("hydrate docs failed for PL", pl.id, e);
      }
    }
  }

  // ===== Модалки =====
  const [showNew, setShowNew] = useState(false);
  const [showCreateCons, setShowCreateCons] = useState(false);
  const [openConsId, setOpenConsId] = useState(null);

  // Создание PL из модалки (с поддержкой создания клиента)
  async function handleCreatePLFromModal(payload) {
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

    // найти/создать клиента
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

    // адрес забора
    const pickup_address =
      incoterm === "EXW"
        ? (exw_address || "").trim()
        : (() => {
            const wh = warehouses.find((w) => w.id === fob_wh_id);
            return wh ? `${wh.name} • ${wh.address}` : "";
          })();

    // тело запроса
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

  // Обновление статуса PL через API + РЕФРЕШ
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
        {/* Поиск/фильтр */}
        <section className="bg-white rounded-2xl shadow-sm border p-4 lg:col-span-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm min-h-[44px]"
                placeholder="Поиск: PL, клиент, груз…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="border rounded-lg text-sm py-2 px-2 min-h-[44px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Все статусы</option>
              {Statuses.filter((s) => s !== "closed").map((s) => (
                <option key={s} value={s}>
                  {humanStatus(s)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm min-h-[44px] w-full md:w-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Новый PL
            </button>
          </div>
        </section>

        {/* Список по этапам с консолидациями */}
        <section className="bg-transparent">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Список PL по этапам
            </div>
            <div className="text-xs text-gray-500">Всего: {filtered.length}</div>
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
                    {groupedByStage[stage]?.length ?? 0}
                  </Chip>
                </div>

                {/* Спец-панель для «Погрузка» */}
                {stage === "loading" && (
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Список PL этого этапа */}
                {groupedByStage[stage].length === 0 ? (
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
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Карточка выбранного PL */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {selected ? (
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
              parts={{ DocsList, CommentsCard, CostCalculatorCard }}
            />
          ) : (
            <EmptySummary items={filtered} />
          )}
        </section>
      </main>

      {/* Модалка создания PL */}
      {showNew && (
        <NewPLModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreatePLFromModal}
          clientOptions={clientOptions}
          warehouses={warehouses}
        />
      )}

      {/* Модалка создания консолидации */}
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

      {/* Модалка деталей консолидации */}
      {openConsId && (
        <ConsolidationDetailsModal
          cons={safeCons.find((c) => c.id === openConsId)}
          allPLs={safePLs}
          consAll={safeCons}
          onClose={() => setOpenConsId(null)}
          onAdvance={async (c) => {
  const next = consNextStatusOf(c.status);
  if (!next) return;

  // какие PL входят
  const plsOfC = safePLs.filter(p => c.pl_ids.includes(p.id));

  // функция ранжирования по OrderedStages
  const rank = (st) => OrderedStages.indexOf(stageOf(st));

  // кого надо подтянуть
  const needUpgrade = plsOfC.filter(p => rank(p.status) < rank(next));

  try {
    // подтянуть отстающие PL до нужного статуса
    await Promise.all(
      needUpgrade.map(p => API.updatePL(p.id, { status: next }))
    );

    // теперь можно двигать консолидацию
    await API.updateCons(c.id, { status: next });

    setOpenConsId(null);
    setSelectedId(null);
    await Promise.all([refreshPLs(), refreshCons()]);
  } catch (e) {
    console.error("updateConsolidation failed:", e);
    // покажем текст бэка, если есть
    try {
      const msg = String(e?.message || "");
      alert(msg.includes("Некоторые PL")
        ? msg
        : "Не удалось перейти к следующему этапу");
    } catch {
      alert("Не удалось перейти к следующему этапу");
    }
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
   Модалки и вспомогательные компоненты,
   оставляем внутри этого файла
=========================== */

// --- Модалка «Создать PL» ---
function NewPLModal({ onClose, onCreate, clientOptions, warehouses }) {
  const [client, setClient] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [title, setTitle] = useState("");
  const [volume, setVolume] = useState("");
  const [weight, setWeight] = useState("");
  const [incoterm, setIncoterm] = useState("EXW"); // EXW | FOB
  const [exwAddress, setExwAddress] = useState("");
  const [fobWh, setFobWh] = useState(warehouses?.[0]?.id || "");
  const [shipperName, setShipperName] = useState("");
  const [shipperContacts, setShipperContacts] = useState("");
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filteredClients = useMemo(() => {
    const q = client.trim().toLowerCase();
    if (!q) return clientOptions.slice(0, 8);
    return clientOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [client, clientOptions]);

  const isValid =
    client.trim() &&
    title.trim() &&
    Number(weight) > 0 &&
    Number(volume) >= 0 &&
    shipperName.trim() &&
    shipperContacts.trim() &&
    (incoterm === "EXW" ? exwAddress.trim() : fobWh);

  function submit() {
    if (!isValid) return;
    onCreate({
      client: client.trim(),
      title: title.trim(),
      volume_cbm: parseFloat(volume),
      weight_kg: parseFloat(weight),
      incoterm,
      exw_address: exwAddress.trim(),
      fob_wh_id: fobWh,
      shipper_name: shipperName.trim(),
      shipper_contacts: shipperContacts.trim(),
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Создать PL</h2>
          <button
            className="p-2 rounded-lg border hover:bg-gray-50"
            onClick={onClose}
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Клиент */}
          <div className="relative">
            <Label>Клиент *</Label>
            <div className="relative">
              <input
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="Начните вводить название компании"
                value={client}
                onChange={(e) => {
                  setClient(e.target.value);
                  setShowClientList(true);
                }}
                onFocus={() => setShowClientList(true)}
              />
              {showClientList && filteredClients.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-auto z-20">
                  {filteredClients.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setClient(c);
                        setShowClientList(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Наименование груза */}
          <div>
            <Label>Наименование груза *</Label>
            <input
              className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
              placeholder="Например: Электроника (партия №12)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Объём / Вес */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Объём, м³ *</Label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="0.00"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
            <div>
              <Label>Вес, кг *</Label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="0.00"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {/* Условия поставки */}
          <div>
            <Label>Условия поставки *</Label>
            <div className="flex gap-2">
              <ToggleChip
                active={incoterm === "EXW"}
                onClick={() => setIncoterm("EXW")}
              >
                EXW
              </ToggleChip>
              <ToggleChip
                active={incoterm === "FOB"}
                onClick={() => setIncoterm("FOB")}
              >
                FOB
              </ToggleChip>
            </div>
          </div>

          {/* EXW адрес */}
          {incoterm === "EXW" && (
            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Адрес забора (EXW) *
              </Label>
              <input
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="Город, район, улица, склад…"
                value={exwAddress}
                onChange={(e) => setExwAddress(e.target.value)}
              />
            </div>
          )}

          {/* FOB склад */}
          {incoterm === "FOB" && (
            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Наш склад (FOB) *
              </Label>
              <select
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                value={fobWh}
                onChange={(e) => setFobWh(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} • {w.address}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Адрес склада подставится автоматически в PL.
              </p>
            </div>
          )}

          {/* Отправитель */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Название отправителя *</Label>
              <input
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="Компания-поставщик"
                value={shipperName}
                onChange={(e) => setShipperName(e.target.value)}
              />
            </div>
            <div>
              <Label>Контакты отправителя *</Label>
              <input
                className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
                placeholder="+86 ..., WeChat: ..."
                value={shipperContacts}
                onChange={(e) => setShipperContacts(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              className={`inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm min-h-[44px] w-full sm:w-auto ${
                isValid ? "bg-black text-white" : "bg-gray-200 text-gray-500"
              }`}
              disabled={!isValid}
              onClick={submit}
            >
              Создать PL
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm min-h-[44px] w-full sm:w-auto border"
              onClick={onClose}
            >
              Отмена
            </button>
            {!isValid && (
              <div className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Заполните все обязательные поля.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Вью пустой сводки (справа, если PL не выбран) ---
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

// --- Сводка по этапам ---
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

/* ===== Комментарии и калькулятор (для PLCard.parts) ===== */

function CommentsCard({ pl, onAdd }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Логист");

  return (
    <div className="space-y-3">
      <div className="border rounded-xl divide-y">
        {(pl.comments || []).length === 0 && (
          <div className="p-3 text-sm text-gray-500">Комментариев пока нет</div>
        )}
        {(Array.isArray(pl.comments) ? pl.comments : []).map((c) => (
          <div key={c.id} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.author}</div>
              <div className="text-xs text-gray-500">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
            <div className="mt-1 text-gray-700 break-words">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <input
          className="border rounded-lg px-3 py-2 min-h-[44px]"
          placeholder="Ваше имя (кто оставил)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <textarea
          className="border rounded-lg px-3 py-2 min-h-[88px]"
          rows={3}
          placeholder="Новый комментарий"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            className="border rounded-lg px-3 py-3 min-h-[44px]"
            onClick={() => {
              if (!text.trim()) return;
              onAdd({
                id: uid(),
                author: author || "Логист",
                text,
                created_at: new Date().toISOString(),
              });
              setText("");
            }}
          >
            Добавить
          </button>
          <span className="text-xs text-gray-500">Автор и время фиксируются</span>
        </div>
      </div>
    </div>
  );
}

function useCostCalculator({ weight_kg, volume_cbm }) {
  // базовые ставки
  const [rate1Kg, setRate1Kg] = useState(0.7);
  const [rate1Cbm, setRate1Cbm] = useState(150);
  const [rate2Kg, setRate2Kg] = useState(0.0);
  const [rate2Cbm, setRate2Cbm] = useState(0.0);
  const [customsFee, setCustomsFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);

  const density = useMemo(() => {
    const w = Number(weight_kg) || 0;
    const v = Number(volume_cbm) || 0;
    if (v <= 0) return null;
    return w / v;
  }, [weight_kg, volume_cbm]);

  const basisSuggestion = useMemo(() => {
    if (density == null) return null;
    return density > 250 ? "kg" : "cbm";
  }, [density]);

  const leg1 = useMemo(() => {
    const w = (Number(weight_kg) || 0) * (Number(rate1Kg) || 0);
    const v = (Number(volume_cbm) || 0) * (Number(rate1Cbm) || 0);
    if (basisSuggestion === "kg") return w;
    if (basisSuggestion === "cbm") return v;
    return Math.max(w, v);
  }, [weight_kg, volume_cbm, rate1Kg, rate1Cbm, basisSuggestion]);

  const leg2 = useMemo(() => {
    const w = (Number(weight_kg) || 0) * (Number(rate2Kg) || 0);
    const v = (Number(volume_cbm) || 0) * (Number(rate2Cbm) || 0);
    if (basisSuggestion === "kg") return w;
    if (basisSuggestion === "cbm") return v;
    return Math.max(w, v);
  }, [weight_kg, volume_cbm, rate2Kg, rate2Cbm, basisSuggestion]);

  const total = useMemo(() => {
    return (
      (Number(leg1) || 0) +
      (Number(leg2) || 0) +
      (Number(customsFee) || 0) +
      (Number(otherFee) || 0)
    );
  }, [leg1, leg2, customsFee, otherFee]);

  return {
    rate1Kg,
    setRate1Kg,
    rate1Cbm,
    setRate1Cbm,
    rate2Kg,
    setRate2Kg,
    rate2Cbm,
    setRate2Cbm,
    customsFee,
    setCustomsFee,
    otherFee,
    setOtherFee,
    density,
    basisSuggestion,
    leg1,
    leg2,
    total,
  };
}

function CostCalculatorCard({ pl, onSave }) {
  const calc = useCostCalculator({
    weight_kg: pl.weight_kg,
    volume_cbm: pl.volume_cbm,
  });

  // локальная цена клиента — синк с активным PL
  const [clientPrice, setClientPrice] = useState(pl.quote?.client_price ?? "");
  useEffect(() => {
    setClientPrice(pl.quote?.client_price ?? "");
  }, [pl.id, pl.quote?.client_price]);

  const calcCost = useMemo(
    () => Math.round((Number(calc.total || 0) + Number.EPSILON) * 100) / 100,
    [calc.total]
  );

  const cp = Number(clientPrice || 0);
  const profit = cp - calcCost;
  const marginPct =
    calcCost > 0
      ? Math.round(((profit / calcCost) * 100 + Number.EPSILON) * 10) / 10
      : 0;

  const perKg = pl.weight_kg > 0 ? cp / pl.weight_kg : null;
  const perCbm = pl.volume_cbm > 0 ? cp / pl.volume_cbm : null;
  const overKg = perKg != null && perKg > 0.7;
  const overCbm = perCbm != null && perCbm > 150;

  const hlKg =
    calc.basisSuggestion === "kg" ? "bg-emerald-50 border-emerald-300" : "";
  const hlCbm =
    calc.basisSuggestion === "cbm" ? "bg-emerald-50 border-emerald-300" : "";

  const badge = (text, good) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        good ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {text}
    </span>
  );

  return (
    <div className="space-y-4 text-sm">
      {/* Плотность и рекомендация */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-gray-600">
          Плотность:{" "}
          <b>{calc.density == null ? "—" : `${Math.round(calc.density)} кг/м³`}</b>
        </div>
        {calc.basisSuggestion === "kg" &&
          badge("Считать по весу (≥ 250 кг/м³)", false)}
        {calc.basisSuggestion === "cbm" &&
          badge("Считать по объёму (< 250 кг/м³)", true)}
      </div>

      {/* 1 */}
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-2">1. Ставка до границы (Китай)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabelInput
            type="number"
            label="$/кг"
            value={calc.rate1Kg}
            inputClass={`transition-colors ${hlKg}`}
            onChange={(v) => calc.setRate1Kg(parseFloat(v || 0))}
          />
          <LabelInput
            type="number"
            label="$/м³"
            value={calc.rate1Cbm}
            inputClass={`transition-colors ${hlCbm}`}
            onChange={(v) => calc.setRate1Cbm(parseFloat(v || 0))}
          />
          <div className="flex flex-col justify-end">
            <div className="text-xs text-gray-600">Стоимость плеча 1</div>
            <div className="text-base font-semibold">
              ${Math.round((calc.leg1 || 0) * 100) / 100}
            </div>
          </div>
        </div>
      </div>

      {/* 2 */}
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-2">2. Ставка с границы до Канта</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabelInput
            type="number"
            label="$/кг"
            value={calc.rate2Kg}
            inputClass={`transition-colors ${hlKg}`}
            onChange={(v) => calc.setRate2Kg(parseFloat(v || 0))}
          />
          <LabelInput
            type="number"
            label="$/м³"
            value={calc.rate2Cbm}
            inputClass={`transition-colors ${hlCbm}`}
            onChange={(v) => calc.setRate2Cbm(parseFloat(v || 0))}
          />
          <div className="flex flex-col justify-end">
            <div className="text-xs text-gray-600">Стоимость плеча 2</div>
            <div className="text-base font-semibold">
              ${Math.round((calc.leg2 || 0) * 100) / 100}
            </div>
          </div>
        </div>
      </div>

      {/* 3–4 и итог */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput
          type="number"
          label="3. Таможня, $"
          value={calc.customsFee}
          onChange={(v) => calc.setCustomsFee(parseFloat(v || 0))}
        />
        <LabelInput
          type="number"
          label="4. Прочие, $"
          value={calc.otherFee}
          onChange={(v) => calc.setOtherFee(parseFloat(v || 0))}
        />
        <div className="flex flex-col justify-end">
          <div className="text-xs text-gray-600">Себестоимость (1+2+3+4)</div>
          <div className="text-base font-semibold">
            ${Math.round((calc.total || 0) * 100) / 100}
          </div>
        </div>
      </div>

      {/* Цена клиента */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <LabelInput
          className="sm:col-span-2"
          type="number"
          label="Цена для клиента, $"
          value={clientPrice}
          onChange={(v) => setClientPrice(v)}
        />
        <KV
          label="Прибыль"
          value={`${cp - calc.total >= 0 ? "+" : ""}${
            Math.round((cp - calc.total) * 100) / 100
          } $`}
          good={cp - calc.total >= 0}
        />
        <KV
          label="Маржа"
          value={`${
            calc.total > 0
              ? Math.round(
                  (((cp - calc.total) / calc.total) * 100 + Number.EPSILON) * 10
                ) / 10
              : 0
          }%`}
          good={calc.total > 0 ? (cp - calc.total) / calc.total >= 0 : true}
        />
      </div>

      {(overKg || overCbm) && (
        <div className="text-xs rounded-lg p-3 border bg-amber-50 text-amber-800">
          {overKg && overCbm && (
            <div>
              Цена превышает среднюю ставку <b>$0.7/кг</b> и <b>$150/м³</b>.
            </div>
          )}
          {overKg && !overCbm && (
            <div>
              Цена превышает среднюю ставку по весу: <b>$0.7/кг</b>
              {perKg != null ? ` (у вас ${perKg.toFixed(3)} $/кг)` : ""}.
            </div>
          )}
          {overCbm && !overKg && (
            <div>
              Цена превышает среднюю ставку по объёму: <b>$150/м³</b>
              {perCbm != null ? ` (у вас ${perCbm.toFixed(2)} $/м³)` : ""}.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          className="border rounded-lg px-3 py-3 text-sm min-h-[44px]"
          onClick={() =>
            onSave(
              Math.round((calc.total || 0) * 100) / 100,
              Number(clientPrice || 0)
            )
          }
        >
          Сохранить расчёт
        </button>
        {pl.quote?.calc_cost != null && (
          <span className="text-xs text-gray-500">
            Сохранено: себестоимость ${pl.quote.calc_cost}, клиенту $
            {pl.quote.client_price}
          </span>
        )}
      </div>
    </div>
  );
}