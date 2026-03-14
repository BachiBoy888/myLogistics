// src/components/ui/BlockedMoveModal.jsx
// Модалка для отображения блокировки перехода статуса с операционными подсказками

import React from "react";
import { X, ArrowRight } from "lucide-react";

/**
 * BlockedMoveModal - Shows when consolidation cannot move to a status
 * due to missing documents on cargos
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string - modal title
 * - documentType: string - name of required document (e.g., "Счет")
 * - blockedCargos: Array<{id: number, plNumber: string, name?: string}> - list of blocked cargos
 * - onCargoClick: (cargoId: number) => void - callback when cargo is clicked
 */
export default function BlockedMoveModal({
  isOpen,
  onClose,
  title = "Нельзя перевести в статус «Оплата»",
  documentType = "Счет",
  blockedCargos = [],
  onCargoClick,
}) {
  if (!isOpen) return null;

  const handleCargoClick = (cargoId) => {
    onCargoClick?.(cargoId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Explanation */}
          <p className="text-sm text-gray-600 mb-3">
            В следующих грузах отсутствует документ «{documentType}»:
          </p>

          {/* Cargo List */}
          <div className="mb-4">
            <ul className="space-y-1.5">
              {blockedCargos.map((cargo) => (
                <li
                  key={cargo.id}
                  className={`
                    flex items-center gap-2 py-1.5 px-2 rounded-md text-sm
                    ${onCargoClick 
                      ? 'hover:bg-blue-50 cursor-pointer transition-colors group' 
                      : ''}
                  `}
                  onClick={() => onCargoClick && handleCargoClick(cargo.id)}
                >
                  <span className="text-gray-400 select-none">—</span>
                  <span className={`
                    font-medium text-gray-900
                    ${onCargoClick ? 'group-hover:text-blue-700' : ''}
                  `}>
                    {cargo.plNumber}
                  </span>
                  {cargo.name && (
                    <span className="text-gray-400 text-xs truncate">
                      {cargo.name}
                    </span>
                  )}
                  {onCargoClick && (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors" />
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Что нужно сделать:</p>
            <p className="text-sm text-gray-700">
              Загрузите документ «{documentType}» для этих грузов, затем повторите попытку.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
