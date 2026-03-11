// src/components/consolidation/ConsolidationDetailsModal.jsx
// Улучшенная карточка консолидации с вкладками, лимитами и расположением грузов

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  X, MoreVertical, Edit3, Trash2, Package, Truck, Calculator,
  ChevronUp, ChevronDown, AlertTriangle, Save, XCircle, Plus, Trash
} from "lucide-react";
import { humanConsStatus, badgeColorByConsStatus, humanStatus } from "../../constants/statuses.js";
import { 
  syncConsolidationExpenses,
  getConsolidation,
} from "../../api/client.js";

// Simple drag handle component
const DragHandle = () => (
  <div className="cursor-move text-gray-400 hover:text-gray-600 p-1">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 6zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 12zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 18z" />
    </svg>
  </div>
);

// Transport Layout Component - auto-layout cargo blocks
function TransportLayout({ pls, totalVolume, capacityVolume }) {
  // Calculate proportional widths based on volume
  const layoutItems = useMemo(() => {
    const effectiveCapacity = Math.max(capacityVolume, totalVolume, 1);
    
    return pls.map((p, idx) => {
      const volume = p.volume_cbm || 0;
      // Width percentage proportional to volume
      const widthPercent = (volume / effectiveCapacity) * 100;
      // Minimum width for visibility, maximum to prevent overflow
      const clampedWidth = Math.max(8, Math.min(35, widthPercent));
      
      return {
        ...p,
        widthPercent: clampedWidth,
        volumeRatio: volume / effectiveCapacity,
        position: idx + 1,
      };
    });
  }, [pls, totalVolume, capacityVolume]);

  // Group items into rows for compact layout
  const rows = useMemo(() => {
    const result = [];
    let currentRow = [];
    let currentRowWidth = 0;
    const maxRowWidth = 98; // Leave small gap
    
    layoutItems.forEach((item) => {
      // If adding this item would exceed row width, start new row
      if (currentRowWidth + item.widthPercent > maxRowWidth && currentRow.length > 0) {
        result.push(currentRow);
        currentRow = [];
        currentRowWidth = 0;
      }
      
      currentRow.push(item);
      currentRowWidth += item.widthPercent;
    });
    
    if (currentRow.length > 0) {
      result.push(currentRow);
    }
    
    return result;
  }, [layoutItems]);

  // Color intensity based on volume ratio
  const getColorIntensity = (ratio) => {
    if (ratio > 0.3) return 'bg-blue-500 border-blue-600';
    if (ratio > 0.15) return 'bg-blue-400 border-blue-500';
    return 'bg-blue-300 border-blue-400';
  };

  if (pls.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 w-full">
          {row.map((item) => (
            <div
              key={item.id}
              className={`${getColorIntensity(item.volumeRatio)} rounded border text-white flex flex-col items-center justify-center p-2 transition-all hover:opacity-90`}
              style={{ 
                width: `${item.widthPercent}%`,
                minHeight: rowIdx === 0 ? '70px' : '60px',
              }}
              title={`${item.pl_number} — ${item.volume_cbm || 0} м³ (${item.widthPercent.toFixed(0)}%)`}
            >
              <span className="font-bold text-sm truncate w-full text-center">
                {item.pl_number}
              </span>
              <span className="text-xs opacity-90">
                {item.volume_cbm || 0} м³
              </span>
              <span className="text-xs opacity-75 mt-0.5">
                #{item.position}
              </span>
            </div>
          ))}
        </div>
      ))}
      
      {/* Capacity indicator bar */}
      {capacityVolume > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Заполнение:</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  totalVolume > capacityVolume ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (totalVolume / capacityVolume) * 100)}%` }}
              />
            </div>
            <span className={`font-medium ${totalVolume > capacityVolume ? 'text-red-600' : 'text-green-600'}`}>
              {((totalVolume / capacityVolume) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsolidationDetailsModal({
  cons,
  allPLs,
  consAll,
  onClose,
  onDissolve,
  onSavePLs,
  onUpdateCons,
}) {
  const [activeTab, setActiveTab] = useState("loading"); // "loading" | "layout" | "calculator"
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
  const [plDetails, setPlDetails] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  
  // Calculator state
  const [machineCost, setMachineCost] = useState(cons.machine_cost || 0);
  const [expenses, setExpenses] = useState(cons.expenses || []);
  const [newExpense, setNewExpense] = useState({ type: 'other', comment: '', amount: '' });
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Initialize plDetails from cons and allPLs
  useEffect(() => {
    setPickedIds(cons.pl_ids || []);
    const initialOrders = {};
    (cons.pl_ids || []).forEach((id, idx) => {
      initialOrders[id] = cons.pl_load_orders?.[id] ?? idx;
    });
    setPlOrders(initialOrders);
    
    // Initialize plDetails with data from PLs and consolidation
    const initialDetails = {};
    (cons.pl_ids || []).forEach((id) => {
      const pl = allPLs.find(p => p.id === id);
      const consDetail = cons.pl_details?.[id] || {};
      
      // Allocated leg2 (Расход KG) from consolidation calculator
      // This is the primary source of truth when PL is in consolidation
      const allocatedLeg2Usd = consDetail.allocatedLeg2Usd;
      const hasAllocatedValue = allocatedLeg2Usd != null && allocatedLeg2Usd !== '' && allocatedLeg2Usd > 0;
      
      // Leg1 cost (Расход CN) - from PL, readonly
      const leg1Cost = Number(pl?.leg1_amount_usd || pl?.leg1AmountUsd || pl?.leg1_amount || pl?.leg1Amount || pl?.calculator?.leg1AmountUSD || 0) || 0;
      
      // Effective leg2 (Расход KG) - two-stage logic:
      // 1. If allocated value exists in consolidation → use it (source of truth after save)
      // 2. Else fallback to PL manual leg2 (initial load only)
      // 3. Else 0
      const effectiveLeg2Usd = hasAllocatedValue
        ? Number(allocatedLeg2Usd)
        : Number(pl?.effective_leg2_usd || pl?.leg2_manual_amount_usd || pl?.leg2_amount_usd || 0) || 0;
      
      initialDetails[id] = {
        // Client price from PL or consolidation
        clientPrice: pl?.quote?.client_price || pl?.client_price || consDetail.clientPrice || 0,
        // Leg1 cost (Расход CN) - from PL, readonly
        leg1Cost,
        // Effective leg2 (Расход KG) - see logic above
        effectiveLeg2Usd,
        // Keep track of allocated value separately
        allocatedLeg2Usd: hasAllocatedValue ? Number(allocatedLeg2Usd) : 0,
        allocationMode: consDetail.allocationMode || 'auto',
      };
    });
    setPlDetails(initialDetails);
    
    setCapacityKg(cons.capacity_kg || 0);
    setCapacityCbm(cons.capacity_cbm || 0);
    setMachineCost(cons.machine_cost || 0);
    setExpenses(cons.expenses || []);
    setHasChanges(false);
  }, [cons.id, cons.pl_ids, cons.pl_load_orders, cons.pl_details, cons.capacity_kg, cons.capacity_cbm, cons.machine_cost, cons.expenses, allPLs]);

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
    const pl = allPLs.find(p => p.id === plId);
    setPickedIds(prev => {
      const next = [...prev, plId];
      // Assign next load order
      const maxOrder = Math.max(0, ...Object.values(plOrders));
      setPlOrders(o => ({ ...o, [plId]: maxOrder + 1 }));
      // Initialize plDetails for new PL
      setPlDetails(d => ({
        ...d,
        [plId]: {
          clientPrice: pl?.quote?.client_price || pl?.client_price || 0,
          leg1Cost: Number(pl?.leg1_amount_usd || pl?.leg1AmountUsd || pl?.leg1_amount || pl?.leg1Amount || pl?.calculator?.leg1AmountUSD || 0) || 0,
          // For new PL: fallback to PL effective leg2 (manual or legacy)
          effectiveLeg2Usd: Number(pl?.effective_leg2_usd || pl?.leg2_manual_amount_usd || pl?.leg2_amount_usd || 0) || 0,
          allocatedLeg2Usd: 0, // Will be set after allocation
          allocationMode: 'auto',
        }
      }));
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
    setPlDetails(prev => {
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
    
    const [moved] = currentPls.splice(fromIndex, 1);
    currentPls.splice(toIndex, 0, moved);
    
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

  // Calculator functions
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalMachineCost = useMemo(() => {
    return Number(machineCost) + totalExpenses;
  }, [machineCost, totalExpenses]);

  const calculatorStats = useMemo(() => {
    const pls = pickedPLs;
    const totalWeight = pls.reduce((s, p) => s + (p.weight_kg || 0), 0);
    const totalVolume = pls.reduce((s, p) => s + (p.volume_cbm || 0), 0);
    
    // Calculate revenue from client prices (from PL data)
    const revenue = pls.reduce((s, p) => {
      const detail = plDetails[p.id] || {};
      return s + (Number(detail.clientPrice) || 0);
    }, 0);
    
    // Calculate leg1 costs (CN) from plDetails
    const leg1Costs = pls.reduce((s, p) => {
      const detail = plDetails[p.id] || {};
      return s + (Number(detail.leg1Cost) || 0);
    }, 0);
    
    // Calculate total allocated machine cost
    const allocatedMachineCost = pls.reduce((s, p) => {
      const detail = plDetails[p.id] || {};
      return s + (Number(detail.effectiveLeg2Usd) || 0);
    }, 0);
    
    const profit = revenue - leg1Costs - totalMachineCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      revenue,
      leg1Costs,
      machineCost: totalMachineCost,
      allocatedMachineCost,
      profit,
      margin,
      totalWeight,
      totalVolume,
    };
  }, [pickedPLs, plDetails, totalMachineCost]);

  // Fixed auto-allocation that guarantees sum equals total
  function autoAllocateCosts() {
    const pls = pickedPLs;
    if (pls.length === 0 || totalMachineCost === 0) return;
    
    const totalWeight = pls.reduce((s, p) => s + (p.weight_kg || 0), 0);
    const totalVolume = pls.reduce((s, p) => s + (p.volume_cbm || 0), 0);
    
    // Calculate allocation factors
    const allocations = pls.map((p) => {
      const weightShare = totalWeight > 0 ? (p.weight_kg || 0) / totalWeight : 0;
      const volumeShare = totalVolume > 0 ? (p.volume_cbm || 0) / totalVolume : 0;
      const allocationFactor = Math.max(weightShare, volumeShare);
      return { plId: p.id, factor: allocationFactor };
    });
    
    // Calculate sum of factors
    const totalFactor = allocations.reduce((s, a) => s + a.factor, 0);
    
    const newDetails = { ...plDetails };
    let distributed = 0;
    
    // Distribute costs proportionally
    allocations.forEach((alloc, idx) => {
      const isLast = idx === allocations.length - 1;
      if (isLast) {
        // Last item gets remainder to ensure exact match
        newDetails[alloc.plId] = {
          ...newDetails[alloc.plId],
          effectiveLeg2Usd: Number((totalMachineCost - distributed).toFixed(2)),
          allocationMode: 'auto',
        };
      } else {
        const share = totalFactor > 0 
          ? (totalMachineCost * alloc.factor / totalFactor)
          : 0;
        const roundedShare = Math.floor(share * 100) / 100; // Round down to 2 decimals
        distributed += roundedShare;
        newDetails[alloc.plId] = {
          ...newDetails[alloc.plId],
          effectiveLeg2Usd: roundedShare,
          allocationMode: 'auto',
        };
      }
    });
    
    setPlDetails(newDetails);
    markChanged();
  }

  function updatePLDetail(plId, field, value) {
    setPlDetails(prev => ({
      ...prev,
      [plId]: {
        ...prev[plId],
        [field]: value,
        ...(field === 'effectiveLeg2Usd' ? { allocationMode: 'manual' } : {}),
      },
    }));
    markChanged();
  }

  async function handleAddExpense() {
    if (!newExpense.amount || Number(newExpense.amount) <= 0) return;
    
    // Add locally only - will be synced to server on Save
    const localExpense = {
      id: 'local_' + Date.now(), // temporary local ID
      type: newExpense.type,
      comment: newExpense.comment,
      amount: Number(newExpense.amount),
      created_at: new Date().toISOString(),
    };
    
    setExpenses(prev => [localExpense, ...prev]);
    setNewExpense({ type: 'other', comment: '', amount: '' });
    setShowAddExpense(false);
    markChanged();
  }

  async function handleDeleteExpense(expenseId) {
    // Delete locally only - will be synced to server on Save
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    markChanged();
  }

  async function handleSave() {
    if (saving) return;
    try {
      setSaving(true);
      
      // Ensure plDetails contains entries for all picked PLs
      const completePlDetails = {};
      pickedIds.forEach((plId) => {
        const existing = plDetails[plId] || {};
        const pl = pickedPLs.find(p => p.id === plId);
        completePlDetails[plId] = {
          clientPrice: Number(existing.clientPrice ?? pl?.quote?.client_price ?? pl?.client_price ?? 0) || 0,
          // Use effectiveLeg2Usd as the allocated value for backend
          allocatedLeg2Usd: Number(existing.effectiveLeg2Usd ?? existing.allocatedLeg2Usd ?? 0) || 0,
          allocationMode: existing.allocationMode || 'auto',
        };
      });
      
      // Save PLs with orders and calculator details
      await onSavePLs?.(cons.id, pickedIds, plOrders, completePlDetails);
      
      // Sync expenses (delete old, create new)
      await syncConsolidationExpenses(cons.id, expenses);
      
      // Save capacity and machine cost
      const consUpdate = {};
      if (capacityKg !== cons.capacity_kg) consUpdate.capacityKg = Number(capacityKg) || 0;
      if (capacityCbm !== cons.capacity_cbm) consUpdate.capacityCbm = Number(capacityCbm) || 0;
      if (machineCost !== cons.machine_cost) consUpdate.machineCost = Number(machineCost) || 0;
      
      if (Object.keys(consUpdate).length > 0) {
        await onUpdateCons?.(cons.id, consUpdate);
      }
      
      // Fetch fresh consolidation data with full pl_details
      const freshCons = await getConsolidation(cons.id);
      
      // Rebuild plDetails from fresh backend data
      if (freshCons?.pl_details) {
        const rebuiltDetails = {};
        pickedIds.forEach((id) => {
          const pl = allPLs.find(p => p.id === id);
          const consDetail =
            freshCons.pl_details?.[id] ??
            freshCons.pl_details?.[String(id)] ??
            {};
          rebuiltDetails[id] = {
            clientPrice: consDetail.clientPrice || 0,
            leg1Cost: Number(pl?.leg1_amount_usd || pl?.leg1AmountUsd || pl?.leg1_amount || pl?.leg1Amount || pl?.calculator?.leg1AmountUSD || 0) || 0,
            // Use allocatedLeg2Usd from backend as effective leg2
            effectiveLeg2Usd: consDetail.allocatedLeg2Usd || 0,
            allocatedLeg2Usd: consDetail.allocatedLeg2Usd || 0,
            allocationMode: consDetail.allocationMode || 'auto',
          };
        });
        setPlDetails(rebuiltDetails);
      }
      
      setHasChanges(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Ошибка сохранения: ' + (err.message || 'Unknown error'));
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

  // Get allocation status display
  const getAllocationStatus = () => {
    const diff = calculatorStats.allocatedMachineCost - totalMachineCost;
    const absDiff = Math.abs(diff);
    
    if (absDiff < 0.01) {
      return {
        type: 'success',
        title: 'Распределено полностью',
        message: '✓ Распределение полное',
      };
    } else if (diff < 0) {
      return {
        type: 'warning',
        title: `Осталось распределить: $${(-diff).toFixed(2)}`,
        message: `Осталось распределить: $${(-diff).toFixed(2)}`,
      };
    } else {
      return {
        type: 'excess',
        title: `Излишек распределения: $${diff.toFixed(2)}`,
        message: `Излишек распределения: $${diff.toFixed(2)}`,
      };
    }
  };

  const allocationStatus = getAllocationStatus();

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
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'calculator'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('calculator')}
          >
            <Calculator className="w-4 h-4" />
            Калькулятор
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'loading' && (
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
          )}

          {activeTab === 'layout' && (
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
              
              {/* Visual representation - Auto Layout */}
              {pickedPLs.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">Схема транспорта (вид сверху)</div>
                    <div className="text-xs text-gray-500">
                      Размеры пропорциональны объёму
                    </div>
                  </div>
                  
                  <div className="relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                    {/* Transport header with labels */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-700">Кабина</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>Направление движения</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">Двери</span>
                        <div className="w-6 h-6 rounded bg-gray-400 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cargo layout area */}
                    <div className="p-3 min-h-[160px]">
                      <TransportLayout 
                        pls={pickedPLs} 
                        totalVolume={stats.sumV}
                        capacityVolume={Number(capacityCbm) || stats.sumV}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Общий объём: {stats.sumV.toFixed(2)} м³</span>
                    {Number(capacityCbm) > 0 && (
                      <span>Вместимость: {Number(capacityCbm).toFixed(2)} м³ ({((stats.sumV / Number(capacityCbm)) * 100).toFixed(0)}%)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* Summary Block */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium mb-3">Сводка по консолидации</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500">Доход</div>
                    <div className="text-lg font-semibold text-green-600">${calculatorStats.revenue.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500">Расход CN</div>
                    <div className="text-lg font-semibold text-orange-600">${calculatorStats.leg1Costs.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500">Расход KG</div>
                    <div className="text-lg font-semibold text-orange-600">${calculatorStats.machineCost.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500">Прибыль</div>
                    <div className={`text-lg font-semibold ${calculatorStats.profit > 0 ? 'text-green-600' : calculatorStats.profit < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {calculatorStats.profit > 0 ? '+' : ''}${calculatorStats.profit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500">Маржа</div>
                    <div className={`text-lg font-semibold ${calculatorStats.margin > 20 ? 'text-green-600' : calculatorStats.margin < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {calculatorStats.margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Machine Costs Block */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium mb-3">Расходы машины</div>
                <div className="mb-4">
                  <label className="text-sm text-gray-600 mb-1 block">Стоимость машины (граница Китая → Кант)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={machineCost} 
                    onChange={(e) => { setMachineCost(e.target.value); markChanged(); }} 
                    className="w-full border rounded-lg px-3 py-2 text-sm" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Дополнительные расходы</span>
                    <button onClick={() => setShowAddExpense(!showAddExpense)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Добавить
                    </button>
                  </div>
                  {showAddExpense && (
                    <div className="bg-white rounded p-3 mb-3 space-y-2">
                      <select 
                        value={newExpense.type} 
                        onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="customs">Таможня</option>
                        <option value="other">Прочие</option>
                      </select>
                      <input type="text" placeholder="Комментарий" value={newExpense.comment} onChange={(e) => setNewExpense({ ...newExpense, comment: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                      <input type="text" inputMode="decimal" placeholder="Сумма" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <button onClick={handleAddExpense} className="bg-green-600 text-white px-4 py-2 rounded text-sm">Добавить</button>
                        <button onClick={() => setShowAddExpense(false)} className="border px-4 py-2 rounded text-sm">Отмена</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="bg-white rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{expense.type === 'customs' ? 'Таможня' : 'Прочие'}</div>
                          {expense.comment && <div className="text-xs text-gray-500">{expense.comment}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">${Number(expense.amount).toFixed(2)}</span>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span>Стоимость машины:</span><span>${Number(machineCost || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span>Доп. расходы:</span><span>${totalExpenses.toFixed(2)}</span></div>
                  <div className="flex justify-between font-medium border-t pt-2"><span>Итого расходы машины:</span><span>${totalMachineCost.toFixed(2)}</span></div>
                </div>
              </div>

              {/* Cargo Table */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Распределение расходов по грузам</div>
                  <button onClick={autoAllocateCosts} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Авто-распределить</button>
                </div>
                <div className="bg-white rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">PL</th>
                        <th className="text-left p-2">Клиент</th>
                        <th className="text-right p-2">Вес/Объём</th>
                        <th className="text-right p-2">Цена клиенту</th>
                        <th className="text-right p-2">Расход CN</th>
                        <th className="text-right p-2">Расход KG</th>
                        <th className="text-right p-2">$/кг</th>
                        <th className="text-right p-2">Прибыль</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pickedPLs.map((p) => {
                        const detail = plDetails[p.id] || {};
                        const clientPrice = Number(detail.clientPrice) || 0;
                        // Leg1 cost (Расход CN) - from PL, readonly
                        const leg1Cost = Number(detail.leg1Cost || 0);
                        // Effective leg2 (Расход KG) - editable, source of truth
                        const effectiveLeg2Usd = Number(detail.effectiveLeg2Usd ?? 0);
                        const profit = clientPrice - leg1Cost - effectiveLeg2Usd;
                        const usdPerKg = (p.weight_kg || 0) > 0 ? effectiveLeg2Usd / p.weight_kg : 0;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-2 font-medium">{p.pl_number}</td>
                            <td className="p-2 text-gray-600">{typeof p.client === 'string' ? p.client : p.client?.name || '—'}</td>
                            <td className="p-2 text-right text-gray-500">{p.weight_kg}кг / {p.volume_cbm}м³</td>
                            <td className="p-2 text-right font-medium">${clientPrice.toFixed(2)}</td>
                            <td className="p-2 text-right text-gray-500">${leg1Cost.toFixed(2)}</td>
                            <td className="p-2">
                              <input 
                                type="text"
                                inputMode="decimal"
                                value={effectiveLeg2Usd}
                                onChange={(e) => updatePLDetail(p.id, 'effectiveLeg2Usd', e.target.value)} 
                                className="w-24 border rounded px-2 py-1 text-right" 
                                placeholder="0" 
                              />
                            </td>
                            <td className="p-2 text-right text-gray-500">{usdPerKg.toFixed(2)}</td>
                            <td className={`p-2 text-right font-medium ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : ''}`}>{profit > 0 ? '+' : ''}${profit.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {calculatorStats.allocatedMachineCost > 0 && (
                  <div className={`mt-3 p-3 rounded text-sm ${
                    allocationStatus.type === 'success' ? 'bg-green-50 text-green-700' : 
                    allocationStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 
                    'bg-orange-50 text-orange-700'
                  }`}>
                    <div className="flex justify-between">
                      <span>Распределено: ${calculatorStats.allocatedMachineCost.toFixed(2)}</span>
                      <span>Всего: ${totalMachineCost.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 font-medium">{allocationStatus.message}</div>
                  </div>
                )}
              </div>
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
