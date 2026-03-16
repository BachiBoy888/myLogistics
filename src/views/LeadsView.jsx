import React, { useEffect, useState, useMemo } from "react";
import { listLeads, getLead, updateLead, convertLeadToPL, deleteLead } from "../api/client.js";
import { 
  Users, Phone, Mail, Building2, MapPin, Package, Calendar, 
  ArrowRight, CheckCircle, X, Trash2, RefreshCw, User, 
  Filter, ChevronDown, ChevronUp, ExternalLink, DollarSign, 
  Clock, Truck, Plane, Zap
} from "lucide-react";

const STATUS_CONFIG = {
  new: { label: "Новый", color: "bg-blue-500", textColor: "text-blue-400", bgColor: "bg-blue-500/10" },
  contacted: { label: "Связались", color: "bg-yellow-500", textColor: "text-yellow-400", bgColor: "bg-yellow-500/10" },
  qualified: { label: "Квалифицирован", color: "bg-purple-500", textColor: "text-purple-400", bgColor: "bg-purple-500/10" },
  converted: { label: "Конвертирован", color: "bg-emerald-500", textColor: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  lost: { label: "Потерян", color: "bg-gray-500", textColor: "text-gray-400", bgColor: "bg-gray-500/10" },
};

const DELIVERY_ICONS = {
  road: Truck,
  air: Plane,
  express: Zap,
};

const DELIVERY_LABELS = {
  road: "Авто",
  air: "Авиа",
  express: "Экспресс",
};

export default function LeadsView({ onOpenPL }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail modal states
  const [showDetail, setShowDetail] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadLeads(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await listLeads(params);
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки лидов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadLeads(false);
    setIsRefreshing(false);
  }

  async function openLeadDetail(lead) {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const fullLead = await getLead(lead.id);
      setDetailLead(fullLead);
    } catch (err) {
      setDetailLead(lead);
    }
    setDetailLoading(false);
  }

  async function handleStatusChange(newStatus) {
    if (!detailLead || detailLead.status === newStatus) return;
    
    setUpdatingStatus(true);
    try {
      const updated = await updateLead(detailLead.id, { status: newStatus });
      setDetailLead(updated);
      setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, status: updated.status } : l));
    } catch (err) {
      alert("Ошибка обновления статуса: " + err.message);
    }
    setUpdatingStatus(false);
  }

  async function handleConvertToPL() {
    if (!detailLead) return;
    
    setConverting(true);
    try {
      const result = await convertLeadToPL(detailLead.id);
      setDetailLead(result.lead);
      setLeads(prev => prev.map(l => l.id === result.lead.id ? { ...l, status: "converted", convertedPlId: result.pl.id } : l));
      alert(`Лид конвертирован в PL ${result.pl.plNumber}`);
    } catch (err) {
      if (err.message?.includes("ALREADY_CONVERTED")) {
        alert("Лид уже был конвертирован ранее");
      } else {
        alert("Ошибка конвертации: " + err.message);
      }
    }
    setConverting(false);
  }

  function handleDeleteClick(lead, e) {
    e.stopPropagation();
    if (lead.status === "converted" && lead.convertedPlId) {
      alert("Нельзя удалить сконвертированный лид. Сначала удалите связанный PL.");
      return;
    }
    setLeadToDelete(lead);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!leadToDelete) return;
    
    setDeleting(true);
    try {
      await deleteLead(leadToDelete.id);
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      setShowDeleteModal(false);
      setLeadToDelete(null);
      if (detailLead?.id === leadToDelete.id) {
        setShowDetail(false);
        setDetailLead(null);
      }
    } catch (err) {
      alert("Ошибка удаления: " + err.message);
    }
    setDeleting(false);
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const formatPrice = (price, currency = "USD") => {
    if (!price) return "—";
    return `$${Number(price).toLocaleString("ru-RU")}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Мои Лиды</h1>
            <p className="text-sm text-slate-400">Заявки из калькулятора</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white py-2 pl-4 pr-10 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = leads.filter(l => l.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? "" : key)}
              className={`p-3 rounded-xl border transition-all text-left ${
                statusFilter === key
                  ? `${config.bgColor} border-${config.color.replace("bg-", "")} ${config.textColor}`
                  : "bg-slate-800 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className={`text-2xl font-bold ${statusFilter === key ? config.textColor : "text-white"}`}>{count}</div>
              <div className={`text-sm ${statusFilter === key ? config.textColor : "text-slate-400"}`}>{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Leads Table */}
      {!loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Лидов не найдено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr className="text-left text-xs font-medium text-slate-400 uppercase">
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Клиент</th>
                    <th className="px-4 py-3">Контакты</th>
                    <th className="px-4 py-3">Параметры</th>
                    <th className="px-4 py-3">Оценка</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leads.map((lead) => {
                    const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                    const DeliveryIcon = DELIVERY_ICONS[lead.deliveryType] || Truck;
                    
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openLeadDetail(lead)}
                        className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-300">{formatDate(lead.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{lead.name}</div>
                          {lead.company && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {lead.company}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {lead.phone}
                          </div>
                          {lead.email && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-300">{lead.weight} кг</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">{lead.volume} м³</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <DeliveryIcon className="w-3 h-3" />
                            {DELIVERY_LABELS[lead.deliveryType] || lead.deliveryType}
                            {lead.originCity && (
                              <>
                                <MapPin className="w-3 h-3 ml-1" />
                                {lead.originCity}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{formatPrice(lead.estimatedPrice, lead.estimatedCurrency)}</div>
                          <div className="text-xs text-slate-400">{lead.estimatedDaysMin}-{lead.estimatedDaysMax} дн.</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`} />
                            {statusConfig.label}
                          </span>
                          {lead.convertedPlId && (
                            <div className="text-xs text-emerald-400 mt-1">PL #{lead.convertedPlId}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => handleDeleteClick(lead, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">Лид #{detailLead.id}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[detailLead.status]?.bgColor} ${STATUS_CONFIG[detailLead.status]?.textColor}`}>
                      {STATUS_CONFIG[detailLead.status]?.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDetail(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" /> Контактная информация
                      </h3>
                      <div className="space-y-2">
                        <div className="text-white font-medium">{detailLead.name}</div>
                        <div className="text-slate-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {detailLead.phone}
                        </div>
                        {detailLead.email && (
                          <div className="text-slate-300 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            {detailLead.email}
                          </div>
                        )}
                        {detailLead.company && (
                          <div className="text-slate-300 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            {detailLead.company}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" /> Параметры груза
                      </h3>
                      <div className="space-y-2 text-sm">
                        {detailLead.cargoName && (
                          <div className="text-white font-medium">{detailLead.cargoName}</div>
                        )}
                        <div className="flex items-center gap-4">
                          <span className="text-slate-300">{detailLead.weight} кг</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300">{detailLead.volume} м³</span>
                        </div>
                        <div className="text-slate-400">
                          {DELIVERY_LABELS[detailLead.deliveryType] || detailLead.deliveryType}
                        </div>
                        {(detailLead.originCity) && (
                          <div className="text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {detailLead.originCity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estimate */}
                  <div className="bg-gradient-to-br from-blue-600/10 to-emerald-600/10 border border-blue-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Предварительная оценка</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">{formatPrice(detailLead.estimatedPrice)}</div>
                        <div className="text-sm text-slate-400">Ориентировочная стоимость</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{detailLead.estimatedDaysMin}-{detailLead.estimatedDaysMax} дн.</div>
                        <div className="text-sm text-slate-400">Срок доставки</div>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {detailLead.note && (
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-slate-400 mb-2">Примечание</h3>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{detailLead.note}</p>
                    </div>
                  )}

                  {/* Manager */}
                  {detailLead.manager && (
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-slate-400 mb-2">Менеджер</h3>
                      <div className="text-slate-300">{detailLead.manager.name}</div>
                    </div>
                  )}

                  {/* Converted PL Link */}
                  {detailLead.convertedPlId && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-emerald-400 font-medium">Конвертирован в PL</div>
                          <div className="text-white">{detailLead.convertedPl?.plNumber || `PL #${detailLead.convertedPlId}`}</div>
                        </div>
                        <button
                          onClick={() => {
                            setShowDetail(false);
                            onOpenPL?.(detailLead.convertedPlId);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        >
                          Открыть PL
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {detailLead.status !== "converted" && (
                    <>
                      <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">Изменить статус</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(STATUS_CONFIG)
                            .filter(([key]) => key !== "converted")
                            .map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(key)}
                              disabled={updatingStatus || detailLead.status === key}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                detailLead.status === key
                                  ? `${config.bgColor} ${config.textColor}`
                                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {config.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-6">
                        <button
                          onClick={handleConvertToPL}
                          disabled={converting}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                          {converting ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Конвертация...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Конвертировать в PL
                            </>
                          )}
                        </button>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                          При конвертации будет создан клиент (если не существует) и новый PL
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Удалить лид?</h3>
            </div>
            <p className="text-slate-400 mb-6">
              Вы уверены, что хотите удалить лид от <strong className="text-white">{leadToDelete?.name}</strong>?
              <br />Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
