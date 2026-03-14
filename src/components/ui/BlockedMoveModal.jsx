// src/components/ui/BlockedMoveModal.jsx
// Модалка для отображения блокировки перехода статуса с операционными подсказками

import React from "react";
import { X, FileX, FileText, ArrowRight } from "lucide-react";

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
  title = "Нельзя перевести консолидацию в статус «Оплата»",
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <FileX className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 leading-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Explanation */}
          <p className="text-gray-700 mb-4">
            У следующих грузов отсутствует документ «{documentType}»:
          </p>

          {/* Cargo List */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <ul className="space-y-2">
              {blockedCargos.map((cargo) => (
                <li
                  key={cargo.id}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg
                    ${onCargoClick 
                      ? 'bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group' 
                      : 'bg-white border border-gray-200'}
                  `}
                  onClick={() => onCargoClick && handleCargoClick(cargo.id)}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${onCargoClick ? 'bg-gray-100 group-hover:bg-blue-100 transition-colors' : 'bg-gray-100'}
                  `}>
                    <FileText className={`
                      w-4 h-4 
                      ${onCargoClick ? 'text-gray-500 group-hover:text-blue-600' : 'text-gray-500'}
                    `} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`
                      font-medium text-sm
                      ${onCargoClick ? 'text-gray-900 group-hover:text-blue-700' : 'text-gray-900'}
                    `}>
                      {cargo.plNumber}
                    </span>
                    {cargo.name && (
                      <p className="text-xs text-gray-500 truncate">
                        {cargo.name}
                      </p>
                    )}
                  </div>
                  {onCargoClick && (
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-amber-800 text-sm">
              <span className="font-medium">Что делать:</span> Загрузите {documentType.toLowerCase()} для этих грузов и попробуйте снова.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
