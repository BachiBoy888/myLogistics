import React from "react";
import { Calculator, MessageCircle, ArrowRight, Phone } from "lucide-react";
import { COMPANY } from "../config/company.js";
import { trackContactClick, trackEvent, EVENTS } from "../utils/analytics.js";

export default function CTABlock({ variant = "primary", showCalculatorButton = true }) {
  const handleCalculatorClick = () => {
    trackEvent(EVENTS.CTA_CLICK, { location: "cta_block", type: "calculator" });
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsAppClick = () => {
    trackContactClick("whatsapp", "cta_block");
  };

  const handlePhoneClick = () => {
    trackContactClick("phone", "cta_block");
  };

  if (variant === "compact") {
    return (
      <section className="py-12 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-white mb-1">
                Готовы отправить груз?
              </h3>
              <p className="text-blue-100">
                Рассчитайте стоимость за 30 секунд
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              {showCalculatorButton && (
                <button
                  onClick={handleCalculatorClick}
                  className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Calculator className="w-5 h-5" />
                  Рассчитать
                </button>
              )}
              <a
                href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Готовы отправить груз из Китая?
        </h2>
        
        <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
          Рассчитайте стоимость доставки онлайн или свяжитесь с нами для получения 
          персональной консультации. Работаем с любыми объемами от 1 кг.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {showCalculatorButton && (
            <button
              onClick={handleCalculatorClick}
              className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Рассчитать доставку
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          
          <a
            href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
            onClick={handleWhatsAppClick}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Написать в WhatsApp
          </a>
          
          <a
            href={`tel:${COMPANY.contacts.phoneRaw}`}
            onClick={handlePhoneClick}
            className="w-full sm:w-auto px-8 py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Позвонить
          </a>
        </div>
      </div>
    </section>
  );
}
