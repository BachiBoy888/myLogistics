// src/components/ui/ErrorModal.jsx
// Модалка для отображения ошибок с title, description и CTA

import React from "react";
import { X, AlertCircle } from "lucide-react";

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title = "Ошибка", 
  description, 
  ctaText = "Понятно",
  onCtaClick 
}) {
  if (!isOpen) return null;

  const handleCta = () => {
    onCtaClick?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900">{title}</h3>
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
          <p className="text-gray-700 leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleCta}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
