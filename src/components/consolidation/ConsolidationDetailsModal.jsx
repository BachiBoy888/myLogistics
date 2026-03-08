// src/components/consolidation/ConsolidationDetailsModal.jsx
// Улучшенная карточка консолидации с вкладками, лимитами и расположением грузов

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  X, MoreVertical, Edit3, Trash2, Package, Truck, 
  ChevronUp, ChevronDown, AlertTriangle, Save, XCircle 
} from "lucide-react";
import { humanConsStatus, badgeColorByConsStatus, humanStatus } from "../../constants/statuses.js";

// Simple drag handle component
const DragHandle = () => (
  <div className="cursor-move text-gray-400 hover:text-gray-600 p-1">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 6zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 12zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 18z" />
    </svg>
  </div>
);

export default function ConsolidationDetailsModal({
  cons,
  allPLs,
  consAll,
  onClose,
  onDissolve,
  onSavePLs,
  onUpdateCons,
}) {
  const [activeTab, setActiveTab] = useState("loading"); // "loading" | "layout"
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  
  // Capacity editing state
  const [capacityKg, setCapacityKg] = useState(cons.capacity_kg || 0);
  const [capacityCbm, setCapacityCbm] = useState(cons.capacity_cbm || 0);
  
  // PL management state
  const [pickedIds, setPickedIds] = useState(cons.pl_ids || []);
  const [plOrders, setPlOrders] = useState(cons.pl_load_orders || {});
  const [saving, setSaving] = useState(false);
  
  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null); // для визуального индикатора drop target

  useEffect(() => {
    setPickedIds(cons.pl_ids || []);
    // Инициализируем порядок для всех PL последовательно
    const initialOrders = {};
    (cons.pl_ids || []).forEach((id, idx) => {
      initialOrders[id] = cons.pl_load_orders?.[id] ?? idx;
    });
    setPlOrders(initialOrders);
    setCapacityKg(cons.capacity_kg || 0);
    setCapacityCbm(cons.capacity_cbm || 0);
    setHasChanges(false);
  }, [cons.id]);

  const busyElsewhere = useMemo(() => {
    const s = new Set();
    (consAll || []).forEach(c => { 
      if (c.id !== cons.id) (c.pl_ids || []).forEach(id => s.add(id)); 
    });
    return s;
  }, [consAll, cons.id]);

  const candidates = useMemo(() =>
    allPLs.filter(p =>
      ["to_load", "loaded"].includes(p.status) &&
      !pickedIds.includes(p.id) &&
      !busyElsewhere.has(p.id)
    ),
    [allPLs, pickedIds, busyElsewhere]
  );

  const pickedPLs = useMemo(() => {
    const pls = pickedIds.map(id => allPLs.find(p => p.id === id)).filter(Boolean);
    // Sort by load order
    return pls.sort((a, b) => (plOrders[a.id] || 0) - (plOrders[b.id] || 0));
  }, [pickedIds, allPLs, plOrders]);

  const stats = useMemo(() => {
    const sumW = pickedPLs.reduce((a, p) => a + (p.weight_kg || 0), 0);
    const sumV = pickedPLs.reduce((a, p) => a + (p.volume_cbm || 0), 0);
    const capKg = Number(capacityKg) || 0;
    const capCbm = Number(capacityCbm) || 0;
    
    return {
      sumW,
      sumV,
      overW: capKg > 0 && sumW > capKg,
      overV: capCbm > 0 && sumV > capCbm,
      freeW: Math.max(0, capKg - sumW),
      freeV: Math.max(0, capCbm - sumV),
      overWeight: Math.max(0, sumW - capKg),
      overVolume: Math.max(0, sumV - capCbm),
    };
  }, [pickedPLs, capacityKg, capacityCbm]);

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  function handleAddPL(plId) {
    setPickedIds(prev => {
      const next = [...prev, plId];
      // Assign next load order
      const maxOrder = Math.max(0, ...Object.values(plOrders));
      setPlOrders(o => ({ ...o, [plId]: maxOrder + 1 }));
      return next;
    });
    markChanged();
  }

  function handleRemovePL(plId) {
    setPickedIds(prev => prev.filter(id => id !== plId));
    setPlOrders(prev => {
      const { [plId]: _, ...rest } = prev;
      return rest;
    });
    markChanged();
  }

  function handleDragStart(plId) {
    setDraggedId(plId);
  }

  function handleDragEnter(targetId) {
    if (draggedId === null || draggedId === targetId) return;
    setDragOverId(targetId);
  }

  function handleDragLeave(e) {
    // Проверяем, что мы действительно покидаем элемент, а не входим в дочерний
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverId(null);
    }
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    
    // Получаем текущий отсортированный список
    const currentPls = [...pickedIds]
      .map(id => ({ id, order: plOrders[id] ?? 0 }))
      .sort((a, b) => a.order - b.order);
    
    const fromIndex = currentPls.findIndex(p => p.id === draggedId);
    let toIndex;
    
    if (targetId === '__END__') {
      toIndex = currentPls.length - 1;
    } else {
      toIndex = currentPls.findIndex(p => p.id === targetId);
    }
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    
    // Перемещаем элемент
    const [moved] = currentPls.splice(fromIndex, 1);
    currentPls.splice(toIndex, 0, moved);
    
    // Пересчитываем порядок
    const newOrders = {};
    currentPls.forEach((p, idx) => {
      newOrders[p.id] = idx;
    });
    
    setPlOrders(newOrders);
    setDraggedId(null);
    setDragOverId(null);
    markChanged();
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  async function handleSave() {
    if (saving) return;
    try {
      setSaving(true);
      await onSavePLs?.(cons.id, pickedIds, plOrders);
      
      // Save capacity if changed
      if (capacityKg !== cons.capacity_kg || capacityCbm !== cons.capacity_cbm) {
        await onUpdateCons?.(cons.id, {
          capacityKg: Number(capacityKg) || 0,
          capacityCbm: Number(capacityCbm) || 0,
        });
      }
      
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }

  function confirmCloseWithoutSaving() {
    setShowUnsavedWarning(false);
    onClose();
  }

  function handleDissolve() {
    if (hasChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    onDissolve?.(cons);
  }

  // Capacity indicator component
  const CapacityIndicator = ({ label, current, capacity, free, over, unit }) => {
    const percentage = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
    const isOver = over > 0;
    
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          <span className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
            {current.toFixed(2)} / {capacity.toFixed(2)} {unit}
          </span>
        </div>
        
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-500">
            Свободно: {free.toFixed(2)} {unit}
          </span>
          {isOver && (
            <span className="text-red-600 font-medium">
              Перегруз: {over.toFixed(2)} {unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{cons.number}</h2>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColorByConsStatus(cons.status)}`}>
                  {humanConsStatus(cons.status)}
                </span>
                {hasChanges && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Несохранённые изменения
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Menu */}
            <div className="relative">
              <button 
                className="p-2 rounded-lg border hover:bg-gray-50"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Редактировать
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      handleDissolve();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Расформировать
                  </button>
                </div>
              )}
            </div>
            
            <button className="p-2 rounded-lg border hover:bg-gray-50" onClick={handleClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Capacity Section */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Грузоподъёмность (кг)</label>
                <input
                  type="number"
                  value={capacityKg}
                  onChange={(e) => {
                    setCapacityKg(e.target.value);
                    markChanged();
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Вместимость (м³)</label>
                <input
                  type="number"
                  value={capacityCbm}
                  onChange={(e) => {
                    setCapacityCbm(e.target.value);
                    markChanged();
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CapacityIndicator
                label="Вес"
                current={stats.sumW}
                capacity={Number(capacityKg) || 0}
                free={stats.freeW}
                over={stats.overWeight}
                unit="кг"
              />
              <CapacityIndicator
                label="Объём"
                current={stats.sumV}
                capacity={Number(capacityCbm) || 0}
                free={stats.freeV}
                over={stats.overVolume}
                unit="м³"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'loading' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('loading')}
          >
            <Package className="w-4 h-4" />
            Погрузка / Выгрузка
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{pickedIds.length}</span>
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'layout' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('layout')}
          >
            <Truck className="w-4 h-4" />
            Расположение грузов
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'loading' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* В консолидации */}
              <div>
                <div className="text-sm font-medium mb-2 flex items-center justify-between">
                  <span>В консолидации</span>
                  <span className="text-xs text-gray-500">
                    {pickedIds.length} PL • {stats.sumW.toFixed(0)} кг • {stats.sumV.toFixed(2)} м³
                  </span>
                </div>
                <div className="border rounded-xl divide-y max-h-[40vh] overflow-auto">
                  {pickedPLs.length === 0 && (
                    <div className="p-4 text-sm text-gray-500 text-center">Пусто</div>
                  )}
                  {pickedPLs.map((p, idx) => (
                    <div 
                      key={p.id} 
                      className="p-3 flex items-center gap-2 hover:bg-gray-50"
                    >
                      <span className="text-xs text-gray-400 w-6">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">
                          {p.pl_number} — {typeof p.client === "string" ? p.client : p.client?.name || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Вес: {p.weight_kg} кг • Объём: {p.volume_cbm} м³
                        </div>
                      </div>
                      <button 
                        className="text-rose-600 text-xs underline px-2"
                        onClick={() => handleRemovePL(p.id)}
                      >
                        Исключить
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Кандидаты */}
              <div>
                <div className="text-sm font-medium mb-2">Доступные к добавлению</div>
                <div className="border rounded-xl divide-y max-h-[40vh] overflow-auto">
                  {candidates.length === 0 && (
                    <div className="p-4 text-sm text-gray-500 text-center">Нет доступных PL</div>
                  )}
                  {candidates.map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">
                          {p.pl_number} — {typeof p.client === "string" ? p.client : p.client?.name || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Вес: {p.weight_kg} кг • Объём: {p.volume_cbm} м³
                        </div>
                      </div>
                      <button 
                        className="text-blue-600 text-xs underline px-2"
                        onClick={() => handleAddPL(p.id)}
                      >
                        Добавить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Layout Tab
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Перетаскивайте грузы для изменения порядка погрузки. 
                Первые в списке — первыми погружаются (внизу кузова).
              </div>
              
              {pickedPLs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Нет грузов в консолидации</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pickedPLs.map((p, idx) => (
                    <React.Fragment key={p.id}>
                      {/* Drop indicator before item */}
                      {dragOverId === p.id && draggedId !== p.id && (
                        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
                      )}
                      <div
                        draggable
                        onDragStart={() => handleDragStart(p.id)}
                        onDragEnter={() => handleDragEnter(p.id)}
                        onDragLeave={handleDragLeave}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, p.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white border-2 rounded-lg p-4 flex items-center gap-3 cursor-move transition-all ${
                          draggedId === p.id 
                            ? 'border-blue-500 shadow-lg opacity-50' 
                            : dragOverId === p.id
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <DragHandle />
                        
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium">{p.pl_number}</div>
                          <div className="text-sm text-gray-500">
                            {typeof p.client === "string" ? p.client : p.client?.name || "—"} • {p.weight_kg} кг • {p.volume_cbm} м³
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          {idx === 0 ? 'Первый' : idx === pickedPLs.length - 1 ? 'Последний' : `Позиция ${idx + 1}`}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  {/* Final drop zone */}
                  <div
                    onDragEnter={() => handleDragEnter('__END__')}
                    onDragLeave={handleDragLeave}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, '__END__')}
                    className={`h-12 rounded-lg border-2 border-dashed flex items-center justify-center text-sm transition-colors ${
                      dragOverId === '__END__' 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 text-gray-400'
                    }`}
                  >
                    {dragOverId === '__END__' ? 'Отпустите для перемещения в конец' : 'Перетащите сюда для перемещения в конец'}
                  </div>
                </div>
              )}
              
              {/* Visual representation */}
              {pickedPLs.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-3">Схема транспорта (вид сверху)</div>
                  <div className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]">
                    <div className="absolute top-2 left-2 text-xs text-gray-400">Кабина</div>
                    <div className="grid grid-cols-1 gap-2 mt-6">
                      {[...pickedPLs].reverse().map((p, idx) => (
                        <div 
                          key={p.id}
                          className="bg-blue-100 border border-blue-300 rounded p-2 text-sm flex items-center justify-between"
                          style={{ 
                            opacity: 0.7 + (0.3 * (pickedPLs.length - idx) / pickedPLs.length) 
                          }}
                        >
                          <span>{p.pl_number}</span>
                          <span className="text-xs text-gray-600">{p.weight_kg} кг</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">Задние двери</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Итого: <b>{stats.sumV.toFixed(2)} м³</b> • <b>{stats.sumW.toFixed(2)} кг</b>
            {(stats.overW || stats.overV) && (
              <span className="text-red-600 ml-2">⚠️ Превышены лимиты</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
              onClick={handleClose}
            >
              Закрыть
            </button>
            
            <button 
              className={`rounded-lg px-4 py-2 text-sm flex items-center gap-2 ${
                hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-500'
              }`}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Unsaved Changes Warning Modal */}
        {showUnsavedWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h3 className="text-lg font-semibold">Несохранённые изменения</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Есть несохранённые изменения. Закрыть без сохранения?
              </p>
              
              <div className="flex gap-3">
                <button
                  className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setShowUnsavedWarning(false)}
                >
                  Остаться
                </button>
                <button
                  className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700"
                  onClick={confirmCloseWithoutSaving}
                >
                  Закрыть без сохранения
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
