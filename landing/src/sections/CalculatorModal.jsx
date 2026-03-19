import React, { useRef, useEffect } from "react";
import { X, Calculator as CalculatorIcon, ArrowRight, RotateCcw, Package, Weight, Ruler, MessageCircle } from "lucide-react";
import { CITIES, DELIVERY_TYPES } from "../config/content.js";
import { useCalculator } from "../hooks/useCalculator.js";
import { useLeadSubmit } from "../hooks/useLeadSubmit.js";
import { formatPrice, formatWeight, generateCalculatorMessage, getWhatsAppLink } from "../utils/helpers.js";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

// Delivery type icons
const TypeIcons = {
  economy: Package,
  standard: Package,
  express: Package,
};

export default function CalculatorModal({ initialData = {}, onClose }) {
  const resultRef = useRef(null);

  const {
    inputs,
    volume,
    result,
    loading,
    error,
    canCalculate,
    updateInput,
    calculate,
    reset,
  } = useCalculator();

  // Set initial data
  useEffect(() => {
    if (initialData.weight) updateInput("weight", initialData.weight);
    if (initialData.volume) {
      // Convert volume to dimensions (approximate cube)
      const dim = Math.cbrt(parseFloat(initialData.volume) || 0) * 100;
      updateInput("length", Math.round(dim));
      updateInput("width", Math.round(dim));
      updateInput("height", Math.round(dim));
    }
    if (initialData.type) {
      const typeMap = { auto: "economy", avia: "express", express: "express" };
      updateInput("deliveryType", typeMap[initialData.type] || "economy");
    }
  }, []);

  const calculatorContext = result ? {
    weight: inputs.weight,
    volume: volume,
    originCity: inputs.originCity,
    deliveryType: inputs.deliveryType,
    estimatedPrice: result.estimatedPrice,
    estimatedCurrency: result.estimatedCurrency,
    estimatedDaysMin: result.estimatedDaysMin,
    estimatedDaysMax: result.estimatedDaysMax,
  } : null;

  const {
    formData,
    updateField,
    submitting,
    success,
    submit,
  } = useLeadSubmit(calculatorContext);

  const handleCalculate = () => {
    calculate();
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    await submit("website_calculator");
  };

  const getWhatsAppMessage = () => {
    if (!result) return "";
    return generateCalculatorMessage({
      weight: inputs.weight,
      volume: volume,
      originCity: CITIES.find((c) => c.value === inputs.originCity)?.label,
      deliveryType: inputs.deliveryType,
      estimatedPrice: result.estimatedPrice,
      estimatedDaysMin: result.estimatedDaysMin,
      estimatedDaysMax: result.estimatedDaysMax,
    });
  };

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <CalculatorIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Расчёт стоимости</h2>
              <p className="text-sm text-gray-500">Узнайте цену за 10 секунд</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Calculator Form */}
            <div className="space-y-6">
              {/* Weight */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Weight className="w-4 h-4 text-gray-400" />
                  Вес груза (кг) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputs.weight}
                  onChange={(e) => updateInput("weight", e.target.value)}
                  placeholder="Например: 50"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Ruler className="w-4 h-4 text-gray-400" />
                  Габариты (см)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    min="1"
                    value={inputs.length}
                    onChange={(e) => updateInput("length", e.target.value)}
                    placeholder="Длина"
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={inputs.width}
                    onChange={(e) => updateInput("width", e.target.value)}
                    placeholder="Ширина"
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={inputs.height}
                    onChange={(e) => updateInput("height", e.target.value)}
                    placeholder="Высота"
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                {volume > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Объем: <span className="font-medium">{volume.toFixed(3)} м³</span>
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Город отправления</label>
                <select
                  value={inputs.originCity}
                  onChange={(e) => updateInput("originCity", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none bg-white"
                >
                  {CITIES.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Способ доставки</label>
                <div className="grid grid-cols-3 gap-3">
                  {DELIVERY_TYPES.map((type) => {
                    const isSelected = inputs.deliveryType === type.key;
                    return (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => updateInput("deliveryType", type.key)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`font-semibold text-sm ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={!canCalculate || loading}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? "Расчёт..." : "Рассчитать стоимость"}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Right - Results */}
            <div ref={resultRef} className="space-y-6">
              {!result && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-xl">
                  <Package className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500">Заполните форму и нажмите «Рассчитать стоимость»</p>
                </div>
              )}

              {result && (
                <>
                  {/* Result Card */}
                  <div className="bg-gray-900 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold">Расчёт доставки</h3>
                      <button
                        onClick={reset}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Новый расчёт"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Вес</span>
                        <span className="font-medium">{formatWeight(inputs.weight)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Объём</span>
                        <span className="font-medium">{volume.toFixed(3)} м³</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Срок</span>
                        <span className="font-medium">{result.estimatedDaysMin}-{result.estimatedDaysMax} дней</span>
                      </div>

                      <div className="pt-4">
                        <div className="text-gray-400 text-sm mb-1">Ориентировочная стоимость</div>
                        <div className="text-3xl font-bold">
                          {formatPrice(result.estimatedPrice, result.estimatedCurrency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lead Form or Success */}
                  {!success ? (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Получить точный расчёт</h3>

                      <form onSubmit={handleSubmitLead} className="space-y-4">
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя *"
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Номер телефона *"
                          value={formData.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                        />
                        <textarea
                          placeholder="Комментарий"
                          rows={3}
                          value={formData.comment}
                          onChange={(e) => updateField("comment", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                        />
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
                        >
                          {submitting ? "Отправка..." : "Получить точный расчёт"}
                          <ArrowRight className="w-4 h-4 inline ml-2" />
                        </button>
                      </form>

                      <div className="mt-4 text-center">
                        <span className="text-gray-500 text-sm">или </span>
                      </div>

                      <a
                        href={getWhatsAppLink(COMPANY.contacts.whatsapp, getWhatsAppMessage())}
                        onClick={() => trackContactClick("whatsapp", "calculator_result")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Написать в WhatsApp
                      </a>
                    </div>
                  ) : (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">Заявка отправлена!</h3>
                      <p className="text-sm text-gray-600">Менеджер свяжется в течение 15 минут.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
