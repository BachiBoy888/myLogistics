// src/views/CargoView.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PLCard from "../components/PLCard.jsx";

// UI
import Chip from "../components/ui/Chip.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import Card from "../components/ui/Card.jsx";
import Label from "../components/ui/Label.jsx";
import LabelInput from "../components/ui/LabelInput.jsx";
import ErrorModal from "../components/ui/ErrorModal.jsx";
import BlockedMoveModal from "../components/ui/BlockedMoveModal.jsx";
import NewPLModal from "../components/pl/NewPLModal.jsx";

// API
import {
  listConsolidations as apiListCons,
  createConsolidation as apiCreateCons,
  updateConsolidation as apiUpdateCons,
  deleteConsolidation as apiDeleteCons,
  getConsolidation as apiGetCons,
  setConsolidationPLs as apiSetConsPLs,
  listPLDocs as apiListPLDocs,
  assignPLResponsible,
  resolveOrCreateClient,
  getPLById,
} from "../api/client";

// Модалки
import ConsolidationCreateModal from "../components/consolidation/ConsolidationCreateModal.jsx";
import ConsolidationDetailsModal from "../components/consolidation/ConsolidationDetailsModal.jsx";
import ImportModal from "../components/import/ImportModal.jsx";

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
  STATUS_DOC_REQUIREMENTS,
  getMissingDocsForStatus,
  getStatusDisplayName,
  DOC_TYPE_DISPLAY_NAMES,
} from "../constants/statuses.js";

import { readinessForPL, canAllowToShip } from "../utils/readiness.js";

// Иконки
import { Package, Search, PlusCircle, X, Filter, User } from "lucide-react";

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
  const API = {
    listPLs: api?.fetchPLs || api?.listPLs,
    createPL: api?.createPL,
    updatePL: api?.updatePL,
    deletePL: api?.deletePL,
    createClient: api?.createClient,
    listCons: api?.fetchCons || api?.listCons || apiListCons,
    getCons: api?.getConsolidation || apiGetCons,
    createCons: api?.createConsolidation || apiCreateCons,
    updateCons: api?.updateConsolidation || apiUpdateCons,
    deleteCons: api?.deleteConsolidation || apiDeleteCons,
    setConsPLs: api?.setConsolidationPLs || apiSetConsPLs,
    listPLDocs: api?.listPLDocs || apiListPLDocs,
  };

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consOnly, setConsOnly] = useState(false);
  const [onlyMy, setOnlyMy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPLs, setSelectedPLs] = useState([]);
  
  // Fresh PL detail state - fetched individually when opening PL card
  const [selectedPLDetail, setSelectedPLDetail] = useState(null);
  const [isLoadingPLDetail, setIsLoadingPLDetail] = useState(false);

  // Fresh Consolidation detail state - fetched individually when opening consolidation
  const [selectedConsDetail, setSelectedConsDetail] = useState(null);
  const [isLoadingConsDetail, setIsLoadingConsDetail] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "Ошибка",
    description: "",
    ctaText: "Понятно",
    type: "error",
  });

  // Blocked move modal state
  const [blockedMoveModal, setBlockedMoveModal] = useState({
    isOpen: false,
    title: "",
    documentType: "",
    blockedCargos: [],
  });

  const showError = (description, title = "Ошибка", ctaText = "Понятно", type = "error") => {
    setErrorModal({ isOpen: true, title, description, ctaText, type });
  };

  const [showNew, setShowNew] = useState(false);
  const [showCreateCons, setShowCreateCons] = useState(false);
  const [openConsId, setOpenConsId] = useState(null);
  const [showImport, setShowImport] = useState(false);

  async function refreshPLs({ keepSelected = true } = {}) {
    try {
      if (!API.listPLs) return;
      const list = await API.listPLs();
      const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
      setPls(safeList);
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

  // Fetch fresh PL detail when opening PL card
  useEffect(() => {
    if (!selectedId) {
      setSelectedPLDetail(null);
      return;
    }

    const abortController = new AbortController();
    const requestId = selectedId;

    async function fetchPLDetail() {
      setIsLoadingPLDetail(true);
      try {
        const freshPL = await getPLById(selectedId);
        // Guard: ignore stale response if ID changed or aborted
        if (abortController.signal.aborted || selectedId !== requestId) {
          return;
        }
        setSelectedPLDetail(freshPL);
      } catch (e) {
        if (abortController.signal.aborted) return;
        setSelectedPLDetail(null);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingPLDetail(false);
        }
      }
    }

    fetchPLDetail();

    return () => {
      abortController.abort();
    };
  }, [selectedId]);

  // Fetch fresh Consolidation detail when opening consolidation modal
  useEffect(() => {
    if (!openConsId) {
      setSelectedConsDetail(null);
      return;
    }

    const abortController = new AbortController();
    const requestId = openConsId;

    async function fetchConsDetail() {
      setIsLoadingConsDetail(true);
      try {
        const freshCons = await API.getCons(openConsId);
        // Guard: ignore stale response if ID changed or aborted
        if (abortController.signal.aborted || openConsId !== requestId) {
          return;
        }
        setSelectedConsDetail(freshCons);
      } catch (e) {
        if (abortController.signal.aborted) return;
        setSelectedConsDetail(null);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingConsDetail(false);
        }
      }
    }

    fetchConsDetail();

    return () => {
      abortController.abort();
    };
  }, [openConsId]);

  const clientNameOf = (pl) =>
    typeof pl?.client === "string"
      ? pl.client
      : pl?.client?.name || pl?.client_name || "";

  const clientOptions = useMemo(() => {
    const s = new Set(safePLs.map((p) => clientNameOf(p)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [safePLs]);

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
      // Фильтр "Только мои" - показывать только PL где текущий пользователь ответственный
      const matchesOnlyMy = !onlyMy || (p.responsible?.id === currentUser?.id);
      return matchesQuery && matchesStatus && matchesOnlyMy;
    });
  }, [safePLs, query, statusFilter, onlyMy, currentUser]);

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
    
    // Если фильтр "Только мои" включен, показываем только консолидации с моими PL
    let filteredCons = safeCons;
    if (onlyMy && currentUser) {
      // Получаем ID PL текущего пользователя
      const myPLIds = new Set(
        safePLs
          .filter((p) => p.responsible?.id === currentUser.id)
          .map((p) => p.id)
      );
      // Фильтруем консолидации - оставляем только те, где есть хотя бы один мой PL
      filteredCons = safeCons.filter((c) => {
        const consPLIds = c.pl_ids || [];
        return consPLIds.some((id) => myPLIds.has(id));
      });
    }
    
    filteredCons.forEach((c) => {
      const st = stageOf(c?.status ?? "to_load");
      if (m[st]) m[st].push({ ...c, stage: st });
    });
    return m;
  }, [safeCons, onlyMy, safePLs, currentUser]);

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
    () => {
      // Только fresh данные из API. Не используем fallback из списка.
      // Calculator должен показываться только с актуальными данными.
      if (!selectedId || !selectedPLDetail) return null;
      return selectedPLDetail;
    },
    [selectedId, selectedPLDetail]
  );

  // Состояние загрузки для показа skeleton
  const isPLLoading = selectedId !== null && (isLoadingPLDetail || !selectedPLDetail);

  // Только fresh данные консолидации из API. Не используем fallback из списка.
  const selectedCons = useMemo(
    () => {
      if (!openConsId || !selectedConsDetail) return null;
      return selectedConsDetail;
    },
    [openConsId, selectedConsDetail]
  );

  // Состояние загрузки консолидации для показа skeleton
  const isConsLoading = openConsId !== null && (isLoadingConsDetail || !selectedConsDetail);

  const handlePLMove = useCallback(
    async (plId, targetStage, isCons = false) => {
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
      if (!newStatus) return;

      if (isCons) {
        // Проверяем, что консолидацию не пытаются переместить в статус только для PL
        const consForbiddenStages = ["intake", "collect_docs", "collect_cargo"];
        if (consForbiddenStages.includes(targetStage)) {
          showError(
            "Консолидации могут находиться только в следующих этапах: Погрузка, Оформление Китай, В пути, Растаможка, Оплата, Закрыто. Для перемещения в Обращение, Сбор документов или Сбор груза — расформируйте консолидацию и переместите грузы отдельно.",
            "Внимание",
            "Понятно",
            "warning"
          );
          return;
        }

        // Move consolidation
        const consItem = safeCons.find((c) => c.id === plId);
        if (!consItem || newStatus === consItem.status) return;

        // Document validation for consolidation moving to Оплата
        if (newStatus === "collect_payment") {
          try {
            // Get all PLs in this consolidation
            const consPLs = safePLs.filter(p => p.consolidationId === plId || p.consolidation_id === plId);
            const plsMissingBill = [];

            for (const pl of consPLs) {
              const docs = await API.listPLDocs(pl.id);
              const hasBill = docs.some(d => d.docType === "bill");
              if (!hasBill) {
                plsMissingBill.push({
                  id: pl.id,
                  plNumber: pl.pl_number || pl.plNumber || `PL-${pl.id}`,
                  name: pl.title || pl.name,
                });
              }
            }

            if (plsMissingBill.length > 0) {
              setBlockedMoveModal({
                isOpen: true,
                title: "Нельзя перевести в статус «Оплата»",
                documentType: "Счет",
                blockedCargos: plsMissingBill,
              });
              return;
            }
          } catch (err) {
            console.error("Ошибка при проверке документов консолидации:", err);
            showError("Не удалось проверить документы грузов в консолидации");
            return;
          }
        }

        try {
          // Backend handles PL status synchronization internally
          await API.updateCons(plId, { status: newStatus });
          
          await Promise.all([refreshPLs(), refreshCons()]);
        } catch (err) {
          console.error("Ошибка при перемещении консолидации:", err);
          
          // Check for structured BLOCKED_MOVE error from backend
          const errorData = err?.errorData;
          if (errorData?.error === "BLOCKED_MOVE" && errorData?.blockedCargos) {
            setBlockedMoveModal({
              isOpen: true,
              title: "Нельзя перевести в статус «Оплата»",
              documentType: errorData.documentType === "invoice" ? "Счет" : (errorData.documentType || "Счет"),
              blockedCargos: errorData.blockedCargos.map(c => ({
                id: c.id,
                plNumber: c.plNumber || c.pl_number || `PL-${c.id}`,
                name: c.name,
              })),
            });
            return;
          }
          
          showError(err?.message || "Не удалось переместить консолидацию");
        }
      } else {
        // Move PL
        const pl = safePLs.find((p) => p.id === plId);
        if (!pl || newStatus === pl.status) return;

        // Document validation for cargo
        const requiredDocTypes = STATUS_DOC_REQUIREMENTS[newStatus];
        if (requiredDocTypes && requiredDocTypes.length > 0) {
          try {
            const docs = await API.listPLDocs(plId);
            const missingDocs = requiredDocTypes.filter(docType => 
              !docs.some(d => d.docType === docType)
            );
            
            if (missingDocs.length > 0) {
              const docNames = missingDocs.map(t => DOC_TYPE_DISPLAY_NAMES[t] || t).join(", ");
              const statusName = getStatusDisplayName(newStatus);
              showError(
                `Нельзя перевести груз в статус «${statusName}». Загрузите документы: ${docNames}. Откройте карточку груза, перейдите во вкладку «Документы» и загрузите необходимые документы.`,
                "Документы не готовы",
                "Понятно",
                "warning"
              );
              return;
            }
          } catch (err) {
            console.error("Ошибка при проверке документов:", err);
            showError("Не удалось проверить документы груза");
            return;
          }
        }

        try {
          await API.updatePL(plId, { status: newStatus });
          await refreshPLs({ keepSelected: true });
          setSelectedPLs([]);
        } catch (err) {
          console.error("Ошибка при перемещении PL:", err);
          showError("Не удалось переместить груз");
        }
      }
    },
    [safePLs, safeCons, API]
  );

  const handleSelectPL = useCallback((plId, isShift) => {
    setSelectedPLs((prev) => {
      if (prev.includes(plId)) {
        return prev.filter((id) => id !== plId);
      }
      return [...prev, plId];
    });
  }, []);

  // Stable close handler to prevent stale closures and force fresh state
  const handleClosePLCard = useCallback(() => {
    setSelectedId(null);
    setSelectedPLDetail(null);
  }, []);

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
      showError("Не удалось сохранить изменения");
      await refreshPLs({ keepSelected: true });
    }
  }

  async function handleCreatePLFromModal(payload) {
    const { client, client_id, title, volume_cbm, weight_kg, incoterm, exw_address, fob_wh_id } = payload;
    const clientName = (client || "").trim();
    if (!clientName) {
      showError("Введите клиента перед созданием PL");
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
        showError("Не удалось определить/создать клиента");
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
      showError("Не удалось сохранить PL");
    }
  }

  async function handleDeletePL(id) {
    try {
      await API.deletePL(id);
      setPls((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p?.id !== id));
      if (selectedId === id) setSelectedId(null);
      await refreshPLs({ keepSelected: true });
    } catch (err) {
      showError("Не удалось удалить PL");
    }
  }

  async function handleExportExcel() {
    try {
      const res = await fetch('/api/pl/export/excel', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pl_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Не удалось экспортировать PL');
    }
  }

  async function handleUpdateStatus(id, status) {
    try {
      await API.updatePL(id, { status });
      await refreshPLs({ keepSelected: true });
      setSelectedId(id);
    } catch (err) {
      showError("Не удалось обновить статус");
    }
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedPLDetail(null); // Ensure detail is cleared on Escape
        setOpenConsId(null);
        setSelectedConsDetail(null); // Ensure cons detail is cleared on Escape
        setShowNew(false);
        setShowCreateCons(false);
        setSelectedPLs([]);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-300" />
          <span className="font-semibold text-gray-100">Мои грузы</span>
          <span className="text-sm text-gray-400">({safePLs.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm w-64 text-gray-100 placeholder-gray-400"
              placeholder="Поиск: номер PL, клиент, груз…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="bg-gray-700 border border-gray-600 rounded-lg text-sm py-2 px-3 text-gray-100"
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
              consOnly 
                ? "bg-blue-600/20 border-blue-500 text-blue-400" 
                : "bg-gray-700 border-gray-600 text-gray-300"
            }`}
          >
            <Filter className="w-4 h-4" />
            Консолидации
          </button>

          <button
            onClick={() => setOnlyMy(!onlyMy)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              onlyMy 
                ? "bg-green-600/20 border-green-500 text-green-400" 
                : "bg-gray-700 border-gray-600 text-gray-300"
            }`}
          >
            <User className="w-4 h-4" />
            Только мои
          </button>

          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Новый PL
          </button>

          <button
            onClick={() => setSummaryOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Сводка
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Экспорт Excel
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Импорт Excel
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          groupedPLs={groupedByStage}
          groupedCons={consByStage}
          allPLs={safePLs}
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

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400 flex items-center justify-between shrink-0">
        <div>
          {selectedPLs.length > 0 && (
            <span className="font-medium text-blue-400">
              Выбрано: {selectedPLs.length} грузов
            </span>
          )}
        </div>
        <div>Перетащите карточку для смены этапа • Shift+Click для множественного выбора</div>
      </div>

      {/* PL Modal - key forces remount for clean state */}
      {/* Loading Skeleton - показываем пока загружаются fresh данные */}
      {isPLLoading && (
        <Modal key="pl-modal-loading" onClose={handleClosePLCard}>
          <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-4xl w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
            </div>
            {/* Калькулятор skeleton */}
            <div className="mt-6 p-4 border rounded-xl bg-gray-50">
              <div className="h-5 w-48 bg-gray-300 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </Modal>
      )}
      {/* Actual PL Card - только после загрузки fresh данных */}
      {selected && (
        <Modal key={`pl-modal-${selected.id}`} onClose={handleClosePLCard}>
          <PLCard
            key={`pl-card-${selected.id}`}
            pl={selected}
            warehouses={warehouses}
            onUpdate={(patch) => savePLPatch(selected.id, patch)}
            onNext={(newStatus) => handleUpdateStatus(selected.id, newStatus)}
            onDelete={() => handleDeletePL(selected.id)}
            onClose={handleClosePLCard}
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
              handleClosePLCard();
              goToClients?.(clientId, clientName);
            }}
            currentUser={currentUser}
          />
        </Modal>
      )}

      {/* Cons Modal */}
      {/* Loading Skeleton for Consolidation */}
      {isConsLoading && (
        <Modal onClose={() => setOpenConsId(null)}>
          <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-4xl w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </Modal>
      )}
      {/* Actual Consolidation Detail - только после загрузки fresh данных */}
      {selectedCons && (
        <Modal onClose={() => setOpenConsId(null)}>
          <ConsolidationDetailsModal
            cons={selectedCons}
            allPLs={safePLs}
            consAll={safeCons}
            onClose={() => setOpenConsId(null)}
            onDissolve={async (c) => {
              try {
                await API.deleteCons(c.id);
                setOpenConsId(null);
                setSelectedConsDetail(null);
                await refreshCons();
                await refreshPLs({ keepSelected: true });
              } catch (e) {
                showError("Не удалось расформировать консолидацию");
              }
            }}
            onSavePLs={async (id, plIds, plLoadOrders, plDetails, { skipRefresh = false } = {}) => {
              try {
                await API.setConsPLs(id, plIds.map(Number), plLoadOrders, plDetails);
                if (!skipRefresh) {
                  await Promise.all([refreshCons(), refreshPLs()]);
                  // Refresh fresh detail for this consolidation
                  try {
                    const freshCons = await API.getCons(id);
                    setSelectedConsDetail(freshCons);
                  } catch (e) {
                    console.error('Failed to refresh cons detail after save:', e);
                  }
                  // If a PL is currently open and was in the saved consolidation, refresh its detail
                  if (selectedId && plIds.map(Number).includes(Number(selectedId))) {
                    try {
                      const freshPL = await getPLById(selectedId);
                      setSelectedPLDetail(freshPL);
                    } catch (e) {
                      console.error('Failed to refresh PL detail after save:', e);
                    }
                  }
                }
              } catch (e) {
                showError("Не удалось сохранить состав консолидации");
              }
            }}
            onUpdateCons={async (id, patch, { skipRefresh = false } = {}) => {
              try {
                await API.updateCons(id, patch);
                if (!skipRefresh) {
                  await refreshCons();
                  // Refresh fresh detail for this consolidation
                  try {
                    const freshCons = await API.getCons(id);
                    setSelectedConsDetail(freshCons);
                  } catch (e) {
                    console.error('Failed to refresh cons detail after update:', e);
                  }
                }
              } catch (e) {
                showError("Не удалось обновить консолидацию");
              }
            }}
            onRefresh={async () => {
              await Promise.all([refreshCons(), refreshPLs()]);
              // Refresh fresh detail
              if (openConsId) {
                try {
                  const freshCons = await API.getCons(openConsId);
                  setSelectedConsDetail(freshCons);
                } catch (e) {
                  console.error('Failed to refresh cons detail:', e);
                }
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
                showError("Не удалось создать консолидацию");
              }
            }}
          />
        </Modal>
      )}

      {/* Summary Drawer */}
      <SummaryDrawer open={summaryOpen} onClose={() => setSummaryOpen(false)} stats={stats} />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        description={errorModal.description}
        ctaText={errorModal.ctaText}
        type={errorModal.type}
      />

      {/* Blocked Move Modal */}
      <BlockedMoveModal
        isOpen={blockedMoveModal.isOpen}
        onClose={() => setBlockedMoveModal(prev => ({ ...prev, isOpen: false }))}
        title={blockedMoveModal.title}
        documentType={blockedMoveModal.documentType}
        blockedCargos={blockedMoveModal.blockedCargos}
        onCargoClick={(cargoId) => {
          // Open the cargo card in Documents tab
          setSelectedId(cargoId);
          setBlockedMoveModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={async () => {
            await refreshPLs();
            setShowImport(false);
          }}
        />
      )}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
        {/* Close button removed - PLCard has its own close button in header */}
        <div className="overflow-y-auto max-h-[90vh]">{children}</div>
      </div>
    </div>
  );
}
