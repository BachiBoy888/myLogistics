import React, { useState } from "react";
import { Phone, MessageCircle, Menu, X } from "lucide-react";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handlePhoneClick = () => {
    trackContactClick("phone", "header");
  };
  
  const handleWhatsAppClick = () => {
    trackContactClick("whatsapp", "header");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/landing/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-bold text-gray-900">{COMPANY.name}</span>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/landing/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Главная
            </a>
            <a href="/landing/delivery.html" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Услуги
            </a>
            <a href="/landing/how-it-works.html" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Как это работает
            </a>
            <a href="/landing/contacts.html" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Контакты
            </a>
          </nav>
          
          {/* Contact */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={`tel:${COMPANY.contacts.phoneRaw}`}
              onClick={handlePhoneClick}
              className="flex items-center gap-1.5 text-sm text-gray-900 font-medium"
            >
              <Phone className="w-4 h-4" />
              {COMPANY.contacts.phone}
            </a>
            <a
              href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
              onClick={handleWhatsAppClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col gap-1">
              <a href="/landing/" className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                Главная
              </a>
              <a href="/landing/delivery.html" className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                Услуги
              </a>
              <a href="/landing/how-it-works.html" className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                Как это работает
              </a>
              <a href="/landing/contacts.html" className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                Контакты
              </a>
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100 px-4 space-y-2">
              <a
                href={`tel:${COMPANY.contacts.phoneRaw}`}
                onClick={handlePhoneClick}
                className="flex items-center gap-2 py-2 text-gray-900 font-medium"
              >
                <Phone className="w-4 h-4" />
                {COMPANY.contacts.phone}
              </a>
              <a
                href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white font-medium rounded-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Написать в WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
