// src/views/ClientsView.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Users, Search, PlusCircle, X, Filter, MoreVertical, 
  Edit3, Trash2, Save, Phone, Building2, Mail, Package, 
  CheckCircle2, Circle, ChevronDown, ChevronUp 
} from "lucide-react";
import { getClients, getClient, createClient, updateClient, deleteClient } from "../api/client.js";
import Chip from "../components/ui/Chip.jsx";
import Card from "../components/ui/Card.jsx";
import LabelInput from "../components/ui/LabelInput.jsx";

// Status configuration
const ACTIVITY_STATUS_CONFIG = {
  active: { label: "Активен", color: "bg-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
  inactive: { label: "Неактивен", color: "bg-gray-400", textColor: "text-gray-600", bgColor: "bg-gray-50" },
};

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

// Normalize string for search
function norm(str = "") {
  return String(str).toLowerCase().trim();
}

export default function ClientsView({ onOpenPL }) {
  // Data states
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filter states
  const [query, setQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [columnFilters, setColumnFilters] = useState({
    name: "",
    company: "",
    phone: "",
  });
  const [activeColumnFilter, setActiveColumnFilter] = useState(null); // null | 'name' | 'company' | 'phone'

  // Modal states
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      const data = await getClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки клиентов");
    } finally {
      setLoading(false);
    }
  }

  // Load client detail when selected
  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientDetail(null);
      return;
    }

    const abortController = new AbortController();

    async function fetchDetail() {
      setIsLoadingDetail(true);
      try {
        const detail = await getClient(selectedClientId);
        if (!abortController.signal.aborted) {
          setSelectedClientDetail(detail);
          setEditForm({
            name: detail.name || "",
            company: detail.company || "",
            phone: detail.phone || "",
            phone2: detail.phone2 || "",
            email: detail.email || "",
            notes: detail.notes || "",
          });
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setSelectedClientDetail(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingDetail(false);
        }
      }
    }

    fetchDetail();

    return () => abortController.abort();
  }, [selectedClientId]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    const q = norm(query);
    
    return clients.filter((c) => {
      // Global search
      const searchFields = [
        c.name,
        c.company,
        c.phone,
        c.phone2,
        c.email,
      ].map(norm).join(" ");
      const matchesQuery = !q || searchFields.includes(q);

      // Activity filter
      const matchesActivity = 
        activityFilter === "all" || 
        c.activityStatus === activityFilter;

      // Column filters
      const matchesNameColumn = !columnFilters.name || 
        norm(c.name).includes(norm(columnFilters.name));
      const matchesCompanyColumn = !columnFilters.company || 
        norm(c.company).includes(norm(columnFilters.company));
      const matchesPhoneColumn = !columnFilters.phone || 
        norm(c.phone).includes(norm(columnFilters.phone)) ||
        norm(c.phone2).includes(norm(columnFilters.phone));

      return matchesQuery && matchesActivity && 
        matchesNameColumn && matchesCompanyColumn && matchesPhoneColumn;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      const aVal = (a[key] || "").toString().toLowerCase();
      const bVal = (b[key] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal, "ru");
      return direction === "asc" ? cmp : -cmp;
    });
  }, [clients, query, activityFilter, columnFilters, sortConfig]);

  // Stats
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.activityStatus === "active").length;
    const inactive = clients.filter(c => c.activityStatus === "inactive").length;
    const withPls = clients.filter(c => c.plCount > 0).length;
    return { total, active, inactive, withPls };
  }, [clients]);

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleCreateClient = async (data) => {
    try {
      await createClient(data);
      await loadClients();
      setShowNewModal(false);
    } catch (err) {
      alert("Ошибка создания клиента: " + err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedClientId || !editForm) return;
    try {
      await updateClient(selectedClientId, editForm);
      await loadClients();
      setIsEditing(false);
      // Refresh detail
      const detail = await getClient(selectedClientId);
      setSelectedClientDetail(detail);
    } catch (err) {
      alert("Ошибка сохранения: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedClientId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteClient(selectedClientId);
      setShowDeleteModal(false);
      setSelectedClientId(null);
      setSelectedClientDetail(null);
      await loadClients();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("409") || msg.includes("CLIENT_HAS_PLS")) {
        setDeleteError("Нельзя удалить клиента: у него есть PL. Сначала удалите/перенесите PL на другого клиента.");
      } else {
        setDeleteError("Ошибка сервера. Попробуйте позже.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedClientId(null);
        setShowNewModal(false);
        setShowDeleteModal(false);
        setIsEditing(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Column header component
  function ColumnHeader({ label, sortKey, filterKey, filterPlaceholder }) {
    const isSorted = sortConfig.key === sortKey;
    const isFilterActive = !!columnFilters[filterKey];
    const isFilterOpen = activeColumnFilter === filterKey;

    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSort(sortKey)}
            className="flex items-center gap-1 hover:text-gray-700"
          >
            {label}
            {isSorted && (
              sortConfig.direction === "asc" ? 
                <ChevronUp className="w-3 h-3" /> : 
                <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => setActiveColumnFilter(isFilterOpen ? null : filterKey)}
            className={`p-1 rounded ${isFilterActive || isFilterOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>
        {isFilterOpen && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={filterPlaceholder}
              value={columnFilters[filterKey]}
              onChange={(e) => setColumnFilters(prev => ({ ...prev, [filterKey]: e.target.value }))}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </th>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Мои клиенты</span>
          <span className="text-sm text-gray-500">({stats.total})</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm w-64 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Поиск: имя, компания, телефон..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Activity Filter */}
          <select
            className="bg-gray-100 border border-gray-200 rounded-lg text-sm py-2 px-3 text-gray-900"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Новый клиент
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-6 text-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Всего:</span>
          <span className="font-semibold text-gray-900">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-gray-500">Активные:</span>
          <span className="font-semibold text-emerald-600">{stats.active}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="text-gray-500">Неактивные:</span>
          <span className="font-semibold text-gray-600">{stats.inactive}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">С PL:</span>
          <span className="font-semibold text-blue-600">{stats.withPls}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <ColumnHeader 
                    label="Клиент" 
                    sortKey="name" 
                    filterKey="name" 
                    filterPlaceholder="Имя клиента..."
                  />
                  <ColumnHeader 
                    label="Компания" 
                    sortKey="company" 
                    filterKey="company" 
                    filterPlaceholder="Название компании..."
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последний закрытый PL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата создания
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => {
                  const statusConfig = ACTIVITY_STATUS_CONFIG[client.activityStatus] || ACTIVITY_STATUS_CONFIG.inactive;
                  
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{client.name}</div>
                        {client.email && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.company ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {client.company}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.phone ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {client.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{client.plCount || 0}</span>
                          {client.activePlCount > 0 && (
                            <span className="text-xs text-emerald-600">
                              ({client.activePlCount} активных)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(client.lastClosedPlDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDate(client.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Клиенты не найдены</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Detail Modal */}
      {selectedClientId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isEditing && setSelectedClientId(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDetail ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : selectedClientDetail ? (
              <>
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      {isEditing ? "Редактирование клиента" : selectedClientDetail.name}
                    </h2>
                    {!isEditing && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        ACTIVITY_STATUS_CONFIG[selectedClientDetail.activityStatus]?.bgColor || "bg-gray-50"
                      } ${
                        ACTIVITY_STATUS_CONFIG[selectedClientDetail.activityStatus]?.textColor || "text-gray-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ACTIVITY_STATUS_CONFIG[selectedClientDetail.activityStatus]?.color || "bg-gray-400"
                        }`} />
                        {ACTIVITY_STATUS_CONFIG[selectedClientDetail.activityStatus]?.label || "Неактивен"}
                      </span>
                    )}
                  </div>
                  
                  {/* Three-dots Menu */}
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                        {/* Dropdown */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Редактировать
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Удалить
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedClientId(null)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  )}
                  
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Сохранить
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm({
                            name: selectedClientDetail.name || "",
                            company: selectedClientDetail.company || "",
                            phone: selectedClientDetail.phone || "",
                            phone2: selectedClientDetail.phone2 || "",
                            email: selectedClientDetail.email || "",
                            notes: selectedClientDetail.notes || "",
                          });
                        }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {isEditing ? (
                      <>
                        <LabelInput
                          label="Название клиента"
                          value={editForm?.name || ""}
                          onChange={(v) => setEditForm(prev => ({ ...prev, name: v }))}
                        />
                        <LabelInput
                          label="Компания"
                          value={editForm?.company || ""}
                          onChange={(v) => setEditForm(prev => ({ ...prev, company: v }))}
                        />
                        <LabelInput
                          label="Телефон"
                          value={editForm?.phone || ""}
                          onChange={(v) => setEditForm(prev => ({ ...prev, phone: v }))}
                        />
                        <LabelInput
                          label="Телефон 2"
                          value={editForm?.phone2 || ""}
                          onChange={(v) => setEditForm(prev => ({ ...prev, phone2: v }))}
                        />
                        <LabelInput
                          label="Email"
                          value={editForm?.email || ""}
                          onChange={(v) => setEditForm(prev => ({ ...prev, email: v }))}
                        />
                      </>
                    ) : (
                      <>
                        <Card title="Контактная информация">
                          <div className="space-y-2">
                            {selectedClientDetail.company && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {selectedClientDetail.company}
                              </div>
                            )}
                            {selectedClientDetail.phone && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {selectedClientDetail.phone}
                              </div>
                            )}
                            {selectedClientDetail.phone2 && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {selectedClientDetail.phone2}
                              </div>
                            )}
                            {selectedClientDetail.email && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {selectedClientDetail.email}
                              </div>
                            )}
                          </div>
                        </Card>
                        <Card title="Статистика">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-gray-900">{selectedClientDetail.plCount || 0}</div>
                              <div className="text-xs text-gray-500">Всего PL</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-emerald-600">{selectedClientDetail.activePlCount || 0}</div>
                              <div className="text-xs text-gray-500">Активных</div>
                            </div>
                          </div>
                          {selectedClientDetail.lastClosedPlDate && (
                            <div className="mt-3 text-sm text-gray-600">
                              Последний закрытый PL: {formatDate(selectedClientDetail.lastClosedPlDate)}
                            </div>
                          )}
                        </Card>
                      </>
                    )}
                  </div>

                  {/* Notes (edit mode) */}
                  {isEditing && editForm && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Примечания
                      </label>
                      <textarea
                        value={editForm.notes || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* PLs List */}
                  {!isEditing && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5 text-gray-500" />
                        Грузы / PL
                        <span className="text-sm font-normal text-gray-500">
                          ({selectedClientDetail.pls?.length || 0})
                        </span>
                      </h3>
                      
                      {selectedClientDetail.pls && selectedClientDetail.pls.length > 0 ? (
                        <div className="space-y-2">
                          {selectedClientDetail.pls.map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => onOpenPL?.(pl.id)}
                              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-gray-900">
                                  {pl.plNumber || `PL-${pl.id}`} — {pl.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {pl.weight && `${pl.weight} кг`} 
                                  {pl.weight && pl.volume && " • "}
                                  {pl.volume && `${pl.volume} м³`}
                                </div>
                              </div>
                              <div className="text-right">
                                <Chip 
                                  color={pl.status === "closed" ? "gray" : "blue"}
                                  size="sm"
                                >
                                  {pl.status === "closed" ? "Закрыт" : "В работе"}
                                </Chip>
                                {pl.clientPrice && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    ${pl.clientPrice}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>У клиента пока нет PL</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Клиент не найден
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewModal && (
        <NewClientModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateClient}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить клиента?</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Клиент <strong>{selectedClientDetail?.name}</strong> будет удалён безвозвратно.
              {selectedClientDetail?.plCount > 0 && (
                <span className="text-red-600 block mt-2">
                  Нельзя удалить клиента с активными PL. Сначала удалите или перенесите грузы.
                </span>
              )}
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {deleteError}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || selectedClientDetail?.plCount > 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedClientDetail?.plCount > 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {isDeleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// New Client Modal Component
function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    phone2: "",
    email: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Введите название клиента");
      return;
    }
    setIsSubmitting(true);
    await onCreate(form);
    setIsSubmitting(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Новый клиент"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Новый клиент</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <LabelInput
            label="Название клиента *"
            value={form.name}
            onChange={(v) => setForm(prev => ({ ...prev, name: v }))}
            required
          />
          <LabelInput
            label="Компания"
            value={form.company}
            onChange={(v) => setForm(prev => ({ ...prev, company: v }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <LabelInput
              label="Телефон"
              value={form.phone}
              onChange={(v) => setForm(prev => ({ ...prev, phone: v }))}
            />
            <LabelInput
              label="Телефон 2"
              value={form.phone2}
              onChange={(v) => setForm(prev => ({ ...prev, phone2: v }))}
            />
          </div>
          <LabelInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm(prev => ({ ...prev, email: v }))}
          />
          <div>
            <label htmlFor="new-client-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Примечания
            </label>
            <textarea
              id="new-client-notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Создание..." : "Создать клиента"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
