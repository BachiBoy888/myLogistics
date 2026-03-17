import React from "react";
import { Phone, MessageCircle, Mail, MapPin, Instagram, Facebook, ArrowUp } from "lucide-react";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

export default function Footer() {
  const handleContactClick = (type) => {
    trackContactClick(type, "footer");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">{COMPANY.name}</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {COMPANY.description}
            </p>
            <div className="flex gap-3">
              {COMPANY.social.instagram && (
                <a
                  href={COMPANY.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {COMPANY.social.facebook && (
                <a
                  href={COMPANY.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Разделы</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/landing/" className="hover:text-white transition-colors">Главная</a></li>
              <li><a href="/landing/delivery.html" className="hover:text-white transition-colors">Доставка из Китая</a></li>
              <li><a href="/landing/calculator.html" className="hover:text-white transition-colors">Калькулятор</a></li>
              <li><a href="/landing/how-it-works.html" className="hover:text-white transition-colors">Как это работает</a></li>
              <li><a href="/landing/contacts.html" className="hover:text-white transition-colors">Контакты</a></li>
            </ul>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Услуги</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Автодоставка из Китая</li>
              <li>Авиадоставка из Китая</li>
              <li>Консолидация грузов</li>
              <li>Таможенное оформление</li>
              <li>Склад в Гуанчжоу</li>
            </ul>
          </div>
          
          {/* Contacts */}
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>
                <a
                  href={`tel:${COMPANY.contacts.phoneRaw}`}
                  onClick={() => handleContactClick("phone")}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                  {COMPANY.contacts.phone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                  onClick={() => handleContactClick("whatsapp")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`https://t.me/${COMPANY.contacts.telegram}`}
                  onClick={() => handleContactClick("telegram")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.contacts.email}`}
                  onClick={() => handleContactClick("email")}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-orange-400" />
                  {COMPANY.contacts.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
                <span>{COMPANY.contacts.address}</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {COMPANY.fullName}. Все права защищены.
          </p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
            Наверх
          </button>
        </div>
      </div>
    </footer>
  );
}
