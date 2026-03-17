import React from "react";
import { Phone, MessageCircle, Mail, MapPin, Menu, X } from "lucide-react";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const navLinks = [
    { href: "/landing/", label: "Главная" },
    { href: "/landing/delivery.html", label: "Доставка из Китая" },
    { href: "/landing/calculator.html", label: "Калькулятор" },
    { href: "/landing/how-it-works.html", label: "Как это работает" },
    { href: "/landing/contacts.html", label: "Контакты" },
  ];
  
  const handlePhoneClick = () => {
    trackContactClick("phone", "header");
  };
  
  const handleWhatsAppClick = () => {
    trackContactClick("whatsapp", "header");
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/landing/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-gray-900">{COMPANY.name}</span>
              <span className="block text-xs text-gray-500">{COMPANY.tagline}</span>
            </div>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-md transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          {/* Contact Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              href={`tel:${COMPANY.contacts.phoneRaw}`}
              onClick={handlePhoneClick}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <Phone className="w-4 h-4" />
              {COMPANY.contacts.phone}
            </a>
            <a
              href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
              onClick={handleWhatsAppClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-blue-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t px-4 space-y-2">
              <a
                href={`tel:${COMPANY.contacts.phoneRaw}`}
                onClick={handlePhoneClick}
                className="flex items-center gap-2 py-2 text-gray-700"
              >
                <Phone className="w-5 h-5 text-blue-600" />
                {COMPANY.contacts.phone}
              </a>
              <a
                href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 text-green-600 font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Написать в WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
