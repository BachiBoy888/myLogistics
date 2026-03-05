// src/components/ui/ErrorModal.jsx
// Модалка для отображения ошибок и предупреждений с title, description и CTA

import React from "react";
import { X, AlertCircle, AlertTriangle } from "lucide-react";

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title = "Ошибка", 
  description, 
  ctaText = "Понятно",
  onCtaClick,
  type = "error" // 'error' | 'warning'
}) {
  if (!isOpen) return null;

  const handleCta = () => {
    onCtaClick?.();
    onClose();
  };

  // Цвета для разных типов
  const styles = type === "warning" ? {
    headerBg: "bg-amber-50",
    headerBorder: "border-amber-100",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    buttonBg: "bg-amber-500",
    buttonHover: "hover:bg-amber-600",
    Icon: AlertTriangle
  } : {
    headerBg: "bg-red-50",
    headerBorder: "border-red-100",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    buttonBg: "bg-red-600",
    buttonHover: "hover:bg-red-700",
    Icon: AlertCircle
  };

  const IconComponent = styles.Icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`${styles.headerBg} px-6 py-4 flex items-center justify-between border-b ${styles.headerBorder}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <h3 className={`text-lg font-semibold ${styles.titleColor}`}>{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 hover:${styles.iconBg} rounded-lg transition-colors`}
          >
            <X className={`w-5 h-5 ${styles.iconColor}`} />
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
            className={`px-6 py-2.5 ${styles.buttonBg} ${styles.buttonHover} text-white font-medium rounded-lg transition-colors`}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
