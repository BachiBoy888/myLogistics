import React, { useRef } from "react";
import { Calculator as CalculatorIcon, ArrowRight, RotateCcw, Package, Weight, Ruler, MapPin, Zap, Truck, Plane } from "lucide-react";
import { CITIES, DELIVERY_TYPES } from "../config/content.js";
import { useCalculator } from "../hooks/useCalculator.js";
import { useLeadSubmit } from "../hooks/useLeadSubmit.js";
import { formatPrice, formatWeight, calculateVolume, generateCalculatorMessage, getWhatsAppLink } from "../utils/helpers.js";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

// Delivery type icons
const TypeIcons = {
  economy: Truck,
  standard: Truck,
  express: Plane,
};

export default function Calculator() {
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
  
  // Prepare calculator context for lead submission
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
    // Scroll to result after calculation
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
      originCity: CITIES.find(c => c.value === inputs.originCity)?.label,
      deliveryType: inputs.deliveryType,
      estimatedPrice: result.estimatedPrice,
      estimatedDaysMin: result.estimatedDaysMin,
      estimatedDaysMax: result.estimatedDaysMax,
    });
  };

  return (
    <section id="calculator" className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
            <CalculatorIcon className="w-4 h-4" />
            Онлайн-калькулятор
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Рассчитайте стоимость доставки
          </h2>
          <p className="text-lg text-gray-600">
            Укажите параметры груза и получите расчет за 30 секунд. 
            Точная стоимость от наших менеджеров.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="space-y-6">
              {/* Weight */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Weight className="w-4 h-4 text-blue-600" />
                  Вес груза (кг) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputs.weight}
                  onChange={(e) => updateInput("weight", e.target.value)}
                  placeholder="Например: 50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Ruler className="w-4 h-4 text-blue-600" />
                  Габариты (см)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    min="1"
                    value={inputs.length}
                    onChange={(e) => updateInput("length", e.target.value)}
                    placeholder="Длина"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={inputs.width}
                    onChange={(e) => updateInput("width", e.target.value)}
                    placeholder="Ширина"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={inputs.height}
                    onChange={(e) => updateInput("height", e.target.value)}
                    placeholder="Высота"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Город отправления
                </label>
                <select
                  value={inputs.originCity}
                  onChange={(e) => updateInput("originCity", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Способ доставки
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DELIVERY_TYPES.map((type) => {
                    const Icon = TypeIcons[type.key];
                    const isSelected = inputs.deliveryType === type.key;
                    return (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => updateInput("deliveryType", type.key)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {type.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                            Популярное
                          </span>
                        )}
                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                        <div className={`font-semibold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                          {type.label}
                        </div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                        <div className="mt-2 text-sm font-medium text-blue-600">
                          от ${type.ratePerKg}/кг
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={!canCalculate || loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>Расчет...</>
                ) : (
                  <>
                    <CalculatorIcon className="w-5 h-5" />
                    Рассчитать стоимость
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results & Lead Form */}
          <div ref={resultRef} className="space-y-6">
            {!result && !loading && (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ваш расчет появится здесь
                </h3>
                <p className="text-gray-600">
                  Заполните форму слева и нажмите «Рассчитать стоимость»
                </p>
              </div>
            )}

            {result && (
              <>
                {/* Result Card */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Расчет доставки</h3>
                    <button
                      onClick={reset}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Новый расчет"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/20">
                      <span className="text-blue-200">Вес груза</span>
                      <span className="font-semibold">{formatWeight(inputs.weight)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/20">
                      <span className="text-blue-200">Объем</span>
                      <span className="font-semibold">{volume.toFixed(3)} м³</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/20">
                      <span className="text-blue-200">Срок доставки</span>
                      <span className="font-semibold">
                        {result.estimatedDaysMin}-{result.estimatedDaysMax} дней
                      </span>
                    </div>
                    
                    <div className="pt-4">
                      <div className="text-blue-200 text-sm mb-1">Ориентировочная стоимость</div>
                      <div className="text-4xl font-bold">
                        {formatPrice(result.estimatedPrice, result.estimatedCurrency)}
                      </div>
                      <div className="text-blue-200 text-sm mt-1">
                        Окончательная цена после проверки менеджером
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lead Form or Success */}
                {!success ? (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Получить точный расчет
                    </h3>
                    
                    <form onSubmit={handleSubmitLead} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя *"
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      
                      <div>
                        <input
                          type="tel"
                          required
                          placeholder="Номер телефона *"
                          value={formData.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          placeholder="Название компании"
                          value={formData.company}
                          onChange={(e) => updateField("company", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      
                      <div>
                        <textarea
                          placeholder="Комментарий (необязательно)"
                          rows={3}
                          value={formData.comment}
                          onChange={(e) => updateField("comment", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? "Отправка..." : "Получить точный расчет"}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <span className="text-gray-500">или</span>
                    </div>

                    <a
                      href={getWhatsAppLink(COMPANY.contacts.whatsapp, getWhatsAppMessage())}
                      onClick={() => trackContactClick("whatsapp", "calculator_result")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Отправить расчет в WhatsApp
                    </a>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Заявка отправлена!</h3>
                    <p className="text-gray-600">
                      Наш менеджер свяжется с вами в течение 15 минут для уточнения деталей.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
