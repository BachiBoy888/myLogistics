import React from "react";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

export default function HeroNew({ onCalculateClick }) {
  const handleWhatsAppClick = () => {
    trackContactClick("whatsapp", "hero");
  };

  return (
    <section className="bg-white min-h-screen flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Main Headline */}
        <div className="mb-12 lg:mb-16">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight leading-tight">
            Доставка из Китая в Бишкек
            <span className="text-gray-400"> / </span>
            От 12 дней
            <span className="text-gray-400"> / </span>
            Таможня включена
          </h1>
        </div>

        {/* Calculator Block */}
        <div className="bg-gray-50 rounded-2xl p-6 lg:p-10">
          <div className="mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
              Расчёт стоимости
            </h2>
            <p className="text-gray-500">Узнайте цену за 10 секунд</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Вес (кг)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-lg font-medium"
                onChange={(e) => {
                  // Pass to parent for calculation
                  window.dispatchEvent(new CustomEvent('calculator:input', { 
                    detail: { field: 'weight', value: e.target.value } 
                  }));
                }}
              />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объём (м³)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-lg font-medium"
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('calculator:input', { 
                    detail: { field: 'volume', value: e.target.value } 
                  }));
                }}
              />
            </div>

            {/* Cargo Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип груза
              </label>
              <select 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-lg font-medium appearance-none cursor-pointer"
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('calculator:input', { 
                    detail: { field: 'type', value: e.target.value } 
                  }));
                }}
              >
                <option value="auto">Авто</option>
                <option value="avia">Авиа</option>
                <option value="express">Экспресс</option>
              </select>
            </div>

            {/* Calculate Button */}
            <div className="flex items-end">
              <button
                onClick={onCalculateClick}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors text-lg"
              >
                Рассчитать
              </button>
            </div>
          </div>

          {/* WhatsApp Alternative */}
          <div className="mt-4 text-center">
            <span className="text-gray-500 text-sm">Или </span>
            <a
              href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
              onClick={handleWhatsAppClick}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 font-medium underline underline-offset-4 hover:text-gray-600 transition-colors"
            >
              написать в WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
