// src/views/CargoView.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PLCard from "../components/PLCard.jsx";

// UI
import Chip from "../components/ui/Chip.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import Card from "../components/ui/Card.jsx";
import Label from "../components/ui/Label.jsx";
import LabelInput from "../components/ui/LabelInput.jsx";
import NewPLModal from "../components/pl/NewPLModal.jsx";

// API
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

// Модалки
import ConsolidationCreateModal from "../components/consolidation/ConsolidationCreateModal.jsx";
import ConsolidationDetailsModal from "../components/consolidation/ConsolidationDetailsModal.jsx";

// Kanban
import KanbanBoard from "../components/kanban/KanbanBoard.jsx";
import SummaryDrawer from "../components/cargo/SummaryDrawer.jsx";

// Константы
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

import { readinessForPL, canAllowToShip } from "../utils/readiness.js";

// Иконки
import { Package, Search, PlusCircle, X, LayoutGrid, List, Filter } from "lucide-react";

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
  goToClients,
}) {
  // API
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

  // UI состояния
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consOnly, setConsOnly] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPLs, setSelectedPLs] = useState([]); // Множественный выбор
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // Модалки
  const [showNew, setShowNew] = useState(false);
  const [showCreateCons, setShowCreateCons] = useState(false);
  const [openConsId, setOpenConsId] = useState(null);

  // Helpers
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

  // Нормализация
  const safePLs = useMemo(() => {
    const arr = Array.isArray(pls) ? pls.filter(Boolean) : [];
    return arr.map((p) => ({
      ...p,
      status: p?.status ?? "draft",
      id: p?.id ?? null,
      pl_number: String(p?.pl_number ?? p?.plNumber ?? ""),
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

  // Открытие PL извне
  useEffect(() => {
    if (openPLId) {
      setSelectedId(openPLId);
      onConsumeOpenPL?.();
    }
  }, [openPLId, onConsumeOpenPL]);

  useEffect(() => {
    refreshCons();
  }, []);
  useEffect(() => {
    refreshPLs({ keepSelected: true });
  }, []);

  const clientNameOf = (pl) =>
    typeof pl?.client === "string"
      ? pl.client
      : pl?.client?.name || pl?.client_name || "";

  const clientOptions = useMemo(() => {
    const s = new Set(safePLs.map((p) => clientNameOf(p)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [safePLs]);

  // Поиск/фильтр
  function norm(str = "") {
    return String(str).toLowerCase().trim();
  }

  const filtered = useMemo(() => {
    const q = norm(query);
    return safePLs.filter((p) => {
      const name = clientNameOf(p);
      const num = p.pl_number || "";
      const haystack = norm(`${num} ${name} ${p.title}`);
      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus =
        statusFilter === "all" || norm(p?.status ?? "draft") === norm(statusFilter);
      return matchesQuery && matchesStatus;
    });
  }, [safePLs, query, statusFilter]);

  // Догрузка доков
  const hydratedDocsRef = useRef(new Set());
  async function hydrateDocsFor(plArray, { limit = 30 } = {}) {
    const toFetch = (plArray || [])
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
  }, [filtered]);

  // Активные консолидации
  const ACTIVE_CONS_STATUSES = new Set([
    "to_load", "loaded", "to_customs", "released", "kg_customs", "delivered",
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

  // Группировка
  const groupedByStage = useMemo(() => {
    const groups = OrderedStages.reduce((acc, k) => ((acc[k] = []), acc), {});
    filtered
      .filter((pl) => !activeConsPLIds.has(pl.id))
      .forEach((pl) => {
        const st = stageOf(pl?.status ?? "draft");
        if (groups[st]) groups[st].push({ ...pl, stage: st });
      });
    return groups;
  }, [filtered, activeConsPLIds]);

  const consByStage = useMemo(() => {
    const m = OrderedStages.reduce((acc, k) => ((acc[k] = []), acc), {});
    safeCons.forEach((c) => {
      const st = stageOf(c?.status ?? "to_load");
      if (m[st]) m[st].push({ ...c, stage: st });
    });
    return m;
  }, [safeCons]);

  // Stats
  const stats = useMemo(() => {
    const total = safePLs.length;
    const closedCount = safePLs.filter((p) =>
      ["closed", "cancelled"].includes(p.status)
    ).length;
    const activeCount = total - closedCount;
    const progressSum = safePLs.reduce((sum, pl) => {
      const stageIdx = OrderedStages.indexOf(stageOf(pl.status));
      const progress = Math.round((stageIdx / (OrderedStages.length - 1)) * 100);
      return sum + progress;
    }, 0);
    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;
    const stageBreakdown = OrderedStages.map((stage) => {
      const count = (groupedByStage[stage] || []).length;
      const label = StageLabels[stage];
      return { stage, label, count, color: "bg-blue-500" };
    });
    return { total, activeCount, closedCount, avgProgress, stageBreakdown };
  }, [safePLs, groupedByStage]);

  const selected = useMemo(
    () => safePLs.find((p) => p.id === selectedId) ?? null,
    [safePLs, selectedId]
  );

  // Drag & Drop
  const handlePLMove = useCallback(
    async (plId, targetStage) => {
      const pl = safePLs.find((p) => p.id === plId);
      if (!pl) return;

      // Map stage to status
      const stageToStatus = {
        intake: "draft",
        collect_docs: "awaiting_docs",
        collect_cargo: "awaiting_load",
        loading: "to_load",
        cn_formalities: "to_customs",
        in_transit: "released",
        kg_customs: "kg_customs",
        payment: "collect_payment",
        closed_stage: "closed",
      };

      const newStatus = stageToStatus[targetStage];
      if (!newStatus || newStatus === pl.status) return;

      try {
        await API.updatePL(plId, { status: newStatus });
        await refreshPLs({ keepSelected: true });
      } catch (err) {
        console.error("Ошибка при перемещении PL:", err);
        alert("Не удалось переместить груз");
      }
    },
    [safePLs, API]
  );

  // Множественный выбор
  const handleSelectPL = useCallback(
    (plId, isMulti) => {
      if (isMulti && lastSelectedId) {
        // Range selection with Shift
        const allPLs = Object.values(groupedByStage).flat();
        const lastIdx = allPLs.findIndex((p) => p.id === lastSelectedId);
        const currentIdx = allPLs.findIndex((p) => p.id === plId);

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = allPLs.slice(start, end + 1).map((p) => p.id);
          setSelectedPLs((prev) => Array.from(new Set([...prev, ...rangeIds])));
        }
      } else {
        setSelectedPLs((prev) =>
          prev.includes(plId)
            ? prev.filter((id) => id !== plId)
            : [...prev, plId]
        );
      }
      setLastSelectedId(plId);
    },
    [groupedByStage, lastSelectedId]
  );

  // Сохранение
  async function savePLPatch(id, patch) {
    const isLocalOnly =
      patch &&
      (Object.prototype.hasOwnProperty.call(patch, "comments") ||
        Object.prototype.hasOwnProperty.call(patch, "docs"));

    if (isLocalOnly) {
      setPls((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          p?.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p
        )
      );
      return;
    }

    try {
      const updated = await API.updatePL(id, patch);
      setPls((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          p?.id === id ? updated ?? { ...p, ...patch, updated_at: new Date().toISOString() } : p
        )
      );
    } catch (e) {
      console.error("Ошибка при сохранении PL:", e);
      alert("Не удалось сохранить изменения");
      await refreshPLs({ keepSelected: true });
    }
  }

  // Создание PL
  async function handleCreatePLFromModal(payload) {
    const { client, client_id, title, volume_cbm, weight_kg, incoterm, exw_address, fob_wh_id } = payload;
    const clientName = (client || "").trim();
    if (!clientName) {
      alert("Введите клиента перед созданием PL");
      return;
    }

    let clientRow = null;
    if (client_id) {
      clientRow = (clients || []).find((c) => Number(c.id) === Number(client_id)) || null;
      if (!clientRow) {
        clientRow = { id: client_id, name: clientName };
        setClients((prev) => [...prev, clientRow]);
      }
    } else {
      try {
        clientRow = await resolveOrCreateClient(clientName);
        if (clientRow && !clients.some((c) => c.id === clientRow.id)) {
          setClients((prev) => [...prev, clientRow]);
        }
      } catch (err) {
        alert("Не удалось определить/создать клиента");
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
      incoterm,
      fob_warehouse_id: incoterm === "FOB" ? fob_wh_id : null,
      status: "draft",
      docs: [],
      comments: [],
      quote: { calc_cost: null, client_price: null },
    };

    try {
      const saved = await API.createPL(body);
      if (currentUser?.id) {
        try {
          await assignPLResponsible(saved.id, currentUser.id);
        } catch (e) {}
      }
      setPls((prev) => [saved, ...(Array.isArray(prev) ? prev : [])]);
      setSelectedId(saved.id);
      setShowNew(false);
      await refreshPLs({ keepSelected: true });
    } catch (e) {
      alert("Не удалось сохранить PL");
    }
  }

  // Удаление
  async function handleDeletePL(id) {
    try {
      await API.deletePL(id);
      setPls((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p?.id !== id));
      if (selectedId === id) setSelectedId(null);
      await refreshPLs({ keepSelected: true });
    } catch (err) {
      alert("Не удалось удалить PL");
    }
  }

  // Обновление статуса
  async function handleUpdateStatus(id, status) {
    try {
      await API.updatePL(id, { status });
      await refreshPLs({ keepSelected: true });
      setSelectedId(id);
    } catch (err) {
      alert("Не удалось обновить статус");
    }
  }

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setOpenConsId(null);
        setShowNew(false);
        setShowCreateCons(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-800">Мои грузы</span>
          <span className="text-sm text-gray-500">({safePLs.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
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

          <button
            onClick={() => setConsOnly(!consOnly)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              consOnly ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            Консолидации
          </button>

          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            <PlusCircle className="w-4 h-4" />
            Новый PL
          </button>

          <button
            onClick={() => setSummaryOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900"
          >
            Сводка
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          groupedPLs={groupedByStage}
          groupedCons={consByStage}
          onPLClick={(pl) => setSelectedId(pl.id)}
          onConsClick={(c) => setOpenConsId(c.id)}
          clientNameOf={clientNameOf}
          onPLMove={handlePLMove}
          selectedPLs={selectedPLs}
          onSelectPL={handleSelectPL}
          consOnly={consOnly}
          onCreateCons={() => setShowCreateCons(true)}
        />
      </div>

      {/* Footer with scrollbar hint */}
      <div className="bg-gray-100 border-t px-4 py-2 text-xs text-gray-500 flex items-center justify-between shrink-0">
        <div>
          {selectedPLs.length > 0 && (
            <span className="font-medium text-blue-600">
              Выбрано: {selectedPLs.length} грузов
            </span>
          )}
        </div>
        <div>Перетащите карточку для смены этапа • Shift+Click для множественного выбора</div>
      </div>

      {/* PL Modal */}
      {selected && (
        <Modal onClose={() => setSelectedId(null)}>
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
        </Modal>
      )}

      {/* Cons Modal */}
      {openConsId && (
        <Modal onClose={() => setOpenConsId(null)}>
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
                await Promise.all(needUpgrade.map((p) => API.updatePL(p.id, { status: next })));
                await API.updateCons(c.id, { status: next });
                setOpenConsId(null);
                await Promise.all([refreshPLs(), refreshCons()]);
              } catch (e) {
                alert("Не удалось перейти к следующему этапу");
              }
            }}
            onDissolve={async (c) => {
              try {
                await API.deleteCons(c.id);
                setOpenConsId(null);
                await refreshCons();
                await refreshPLs({ keepSelected: true });
              } catch (e) {
                alert("Не удалось расформировать консолидацию");
              }
            }}
            onSavePLs={async (id, plIds) => {
              try {
                await API.setConsPLs(id, plIds.map(Number));
                await Promise.all([refreshCons(), refreshPLs()]);
              } catch (e) {
                alert("Не удалось сохранить состав консолидации");
              }
            }}
          />
        </Modal>
      )}

      {/* New PL Modal */}
      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <NewPLModal
            onClose={() => setShowNew(false)}
            onCreate={handleCreatePLFromModal}
            clientOptions={clientOptions}
            warehouses={warehouses}
          />
        </Modal>
      )}

      {/* Create Cons Modal */}
      {showCreateCons && (
        <Modal onClose={() => setShowCreateCons(false)}>
          <ConsolidationCreateModal
            onClose={() => setShowCreateCons(false)}
            plsCandidate={Object.values(groupedByStage)
              .flat()
              .filter((p) => ["to_load", "loaded"].includes(p.status))}
            onCreate={async ({ pl_ids }) => {
              try {
                await API.createCons({ title: `Консолидация`, plIds: pl_ids.map(Number) });
                setShowCreateCons(false);
                await refreshCons();
              } catch (e) {
                alert("Не удалось создать консолидацию");
              }
            }}
          />
        </Modal>
      )}

      {/* Summary Drawer */}
      <SummaryDrawer open={summaryOpen} onClose={() => setSummaryOpen(false)} stats={stats} />
    </div>
  );
}

// Modal component with click outside
function Modal({ children, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="overflow-y-auto max-h-[90vh]">{children}</div>
      </div>
    </div>
  );
}
