import React from "react";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";
import { COMPANY } from "../config/company.js";
import { trackContactClick } from "../utils/analytics.js";

export default function Footer() {
  const handleContactClick = (type) => {
    trackContactClick(type, "footer");
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold">P</span>
              </div>
              <span className="font-bold text-xl">{COMPANY.name}</span>
            </div>
            <p className="text-gray-400 max-w-sm">
              {COMPANY.description}
            </p>
          </div>
          
          {/* Office */}
          <div>
            <h3 className="font-semibold mb-4">Офис</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p>Бишкек, Льва Толстого 36к/1</p>
                  <p className="text-gray-500 text-sm">{COMPANY.contacts.officeName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Режим работы</p>
                <p>{COMPANY.contacts.workHours}</p>
              </div>
            </div>
          </div>
          
          {/* Contacts */}
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${COMPANY.contacts.phoneRaw}`}
                  onClick={() => handleContactClick("phone")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {COMPANY.contacts.phone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${COMPANY.contacts.whatsapp}`}
                  onClick={() => handleContactClick("whatsapp")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.contacts.email}`}
                  onClick={() => handleContactClick("email")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {COMPANY.contacts.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {COMPANY.fullName}. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
