import React from "react";
import { ArrowRight, MessageCircle, Calculator, Shield, Clock, Package } from "lucide-react";
import { HERO } from "../config/content.js";
import { COMPANY } from "../config/company.js";
import { trackContactClick, trackEvent, EVENTS } from "../utils/analytics.js";

export default function Hero({ onCalculateClick, compact = false }) {
  const handleCalculateClick = () => {
    trackEvent(EVENTS.CTA_CLICK, { location: "hero", type: "calculator" });
    onCalculateClick?.();
  };

  const handleWhatsAppClick = () => {
    trackContactClick("whatsapp", "hero");
  };

  if (compact) {
    return (
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              {HERO.headline}
              <span className="text-blue-400"> {HERO.headlineHighlight}</span>
            </h1>
            <p className="text-lg text-gray-300 mb-6">{HERO.subheadline}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {HERO.trustBadges.map((badge) => (
                <span key={badge} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Надежная доставка с {COMPANY.established} года
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {HERO.headline}
              <span className="block text-blue-400 mt-2">{HERO.headlineHighlight}</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0">
              {HERO.subheadline}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={handleCalculateClick}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/25"
              >
                <Calculator className="w-5 h-5" />
                {HERO.ctaPrimary}
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <a
                href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {HERO.ctaSecondary}
              </a>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-4">
              {HERO.trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Content - Quick Stats */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Package className="w-10 h-10 text-blue-400 mb-4" />
              <div className="text-3xl font-bold mb-1">5000+</div>
              <div className="text-gray-400 text-sm">Доставленных грузов</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Clock className="w-10 h-10 text-green-400 mb-4" />
              <div className="text-3xl font-bold mb-1">12-15</div>
              <div className="text-gray-400 text-sm">Дней авто доставка</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Shield className="w-10 h-10 text-orange-400 mb-4" />
              <div className="text-3xl font-bold mb-1">100%</div>
              <div className="text-gray-400 text-sm">Гарантия сохранности</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <MessageCircle className="w-10 h-10 text-purple-400 mb-4" />
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-gray-400 text-sm">Поддержка клиентов</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
