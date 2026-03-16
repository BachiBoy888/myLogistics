import React, { useState } from "react";
import { Calculator, Package, MapPin, Phone, User, Building2, Mail, FileText, CheckCircle, ArrowRight, Truck, Plane, Zap } from "lucide-react";
import { calculateShippingEstimate, submitLead } from "../api/client.js";

const DELIVERY_TYPES = [
  { key: "road", label: "Авто", icon: Truck, description: "12-17 дней, выгодно" },
  { key: "air", label: "Авиа", icon: Plane, description: "5-8 дней, быстро" },
  { key: "express", label: "Экспресс", icon: Zap, description: "3-5 дней, срочно" },
];

export default function PublicCalculatorPage() {
  const [step, setStep] = useState("form"); // 'form' | 'calculating' | 'result' | 'lead-form' | 'submitting' | 'success'
  const [formData, setFormData] = useState({
    cargoName: "",
    weight: "",
    volume: "",
    originCity: "",
    destinationCity: "Гуанчжоу",
    deliveryType: "road",
  });
  const [estimate, setEstimate] = useState(null);
  const [leadData, setLeadData] = useState({
    name: "",
    phone: "",
    company: "",
    email: "",
    note: "",
  });
  const [error, setError] = useState(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError(null);

    const weight = parseFloat(formData.weight);
    const volume = parseFloat(formData.volume);

    if (!weight || weight <= 0) {
      setError("Укажите корректный вес");
      return;
    }
    if (!volume || volume <= 0) {
      setError("Укажите корректный объём");
      return;
    }

    setStep("calculating");

    try {
      const result = await calculateShippingEstimate({
        weight,
        volume,
        originCity: formData.originCity || undefined,
        destinationCity: formData.destinationCity || undefined,
        deliveryType: formData.deliveryType,
        cargoName: formData.cargoName || undefined,
      });

      setEstimate(result);
      setStep("result");
    } catch (err) {
      setError(err.message || "Ошибка расчёта. Попробуйте позже.");
      setStep("form");
    }
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setError(null);

    if (!leadData.name.trim()) {
      setError("Укажите ваше имя");
      return;
    }
    if (!leadData.phone.trim() || leadData.phone.length < 5) {
      setError("Укажите корректный телефон");
      return;
    }

    setStep("submitting");

    try {
      await submitLead({
        name: leadData.name.trim(),
        phone: leadData.phone.trim(),
        company: leadData.company.trim() || undefined,
        email: leadData.email.trim() || undefined,
        note: leadData.note.trim() || undefined,
        cargoName: formData.cargoName || undefined,
        weight: parseFloat(formData.weight),
        volume: parseFloat(formData.volume),
        originCity: formData.originCity || undefined,
        destinationCity: formData.destinationCity || undefined,
        deliveryType: formData.deliveryType,
        estimatedPrice: estimate?.estimatedPrice,
        estimatedCurrency: estimate?.estimatedCurrency,
        estimatedDaysMin: estimate?.estimatedDaysMin,
        estimatedDaysMax: estimate?.estimatedDaysMax,
      });

      setStep("success");
    } catch (err) {
      setError(err.message || "Ошибка отправки. Попробуйте позже.");
      setStep("lead-form");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ru-RU").format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Моя Логистика</h1>
              <p className="text-xs text-slate-400">Доставка грузов из Китая</p>
            </div>
          </div>
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Войти в систему →
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            step === "form" || step === "calculating" 
              ? "bg-blue-600 text-white" 
              : "bg-slate-700 text-slate-300"
          }`}>
            <Calculator className="w-4 h-4" />
            Расчёт
          </div>
          <div className="w-8 h-px bg-slate-700" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            step === "lead-form" || step === "submitting"
              ? "bg-blue-600 text-white"
              : step === "success"
              ? "bg-green-600 text-white"
              : "bg-slate-700/50 text-slate-500"
          }`}>
            <User className="w-4 h-4" />
            Контакты
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Calculator Form */}
        {(step === "form" || step === "calculating") && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Расчёт стоимости доставки</h2>
            <p className="text-slate-400 mb-6">Заполните параметры груза для получения предварительной оценки</p>

            <form onSubmit={handleCalculate} className="space-y-5">
              {/* Cargo Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Название груза
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.cargoName}
                    onChange={(e) => setFormData(d => ({ ...d, cargoName: e.target.value }))}
                    placeholder="Например: Электроника, одежда..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Weight & Volume */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Вес, кг *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData(d => ({ ...d, weight: e.target.value }))}
                    placeholder="100"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Объём, м³ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.volume}
                    onChange={(e) => setFormData(d => ({ ...d, volume: e.target.value }))}
                    placeholder="1.5"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Cities */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Откуда
                  </label>
                  <input
                    type="text"
                    value={formData.originCity}
                    onChange={(e) => setFormData(d => ({ ...d, originCity: e.target.value }))}
                    placeholder="Город в Китае"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Куда
                  </label>
                  <input
                    type="text"
                    value={formData.destinationCity}
                    onChange={(e) => setFormData(d => ({ ...d, destinationCity: e.target.value }))}
                    placeholder="Город доставки"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Delivery Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Способ доставки *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DELIVERY_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => setFormData(d => ({ ...d, deliveryType: type.key }))}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          formData.deliveryType === type.key
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${
                          formData.deliveryType === type.key ? "text-blue-400" : "text-slate-500"
                        }`} />
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs opacity-70 mt-1">{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={step === "calculating"}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {step === "calculating" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Расчёт...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Рассчитать стоимость
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Result */}
        {step === "result" && estimate && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Предварительная оценка</h2>
                <p className="text-slate-400">Расчёт приблизительный. Точная стоимость после оценки груза.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-white">
                    ${formatPrice(estimate.estimatedPrice)}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Ориентировочная стоимость</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-white">
                    {estimate.estimatedDaysMin}-{estimate.estimatedDaysMax}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Дней доставки</div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Параметры расчёта</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-slate-500">Вес:</span>
                  <span className="text-white">{formData.weight} кг</span>
                  <span className="text-slate-500">Объём:</span>
                  <span className="text-white">{formData.volume} м³</span>
                  <span className="text-slate-500">Способ:</span>
                  <span className="text-white">{DELIVERY_TYPES.find(t => t.key === formData.deliveryType)?.label}</span>
                  {formData.originCity && (
                    <>
                      <span className="text-slate-500">Маршрут:</span>
                      <span className="text-white">{formData.originCity} → {formData.destinationCity || "—"}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep("lead-form")}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Получить точный расчёт
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setStep("form")}
              className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
            >
              ← Изменить параметры
            </button>
          </div>
        )}

        {/* Step 3: Lead Form */}
        {(step === "lead-form" || step === "submitting") && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Оставьте контакты</h2>
            <p className="text-slate-400 mb-6">Мы свяжемся с вами и рассчитаем точную стоимость доставки</p>

            <form onSubmit={handleSubmitLead} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadData.name}
                    onChange={(e) => setLeadData(d => ({ ...d, name: e.target.value }))}
                    placeholder="Иван Иванов"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadData.phone}
                    onChange={(e) => setLeadData(d => ({ ...d, phone: e.target.value }))}
                    placeholder="+996 555 123 456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Компания
                  </label>
                  <input
                    type="text"
                    value={leadData.company}
                    onChange={(e) => setLeadData(d => ({ ...d, company: e.target.value }))}
                    placeholder="ООО Компания"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={leadData.email}
                    onChange={(e) => setLeadData(d => ({ ...d, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Примечание
                </label>
                <textarea
                  value={leadData.note}
                  onChange={(e) => setLeadData(d => ({ ...d, note: e.target.value }))}
                  placeholder="Дополнительная информация о грузе..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={step === "submitting"}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {step === "submitting" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    Отправить заявку
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => setStep("result")}
              className="w-full text-slate-400 hover:text-white text-sm py-2 mt-4 transition-colors"
            >
              ← Назад к расчёту
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Заявка принята!</h2>
            <p className="text-slate-300 mb-6">
              Мы получили вашу заявку и свяжемся с вами в ближайшее время для уточнения деталей.
            </p>
            <button
              onClick={() => {
                setStep("form");
                setFormData({ cargoName: "", weight: "", volume: "", originCity: "", destinationCity: "Гуанчжоу", deliveryType: "road" });
                setLeadData({ name: "", phone: "", company: "", email: "", note: "" });
                setEstimate(null);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              Новый расчёт
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} Моя Логистика. Доставка грузов из Китая.
        </div>
      </footer>
    </div>
  );
}
