import React from "react";
import { MapPin, ArrowRight, Clock, DollarSign } from "lucide-react";
import { ROUTES } from "../config/content.js";

export default function Routes() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Популярные направления
          </h2>
          <p className="text-lg text-gray-600">
            Доставляем грузы из основных городов Китая
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {ROUTES.map((route) => (
            <div
              key={route.from}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{route.from}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{route.to}</span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{route.description}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-700">
                  <Clock className="w-4 h-4" />
                  {route.daysMin}-{route.daysMax} дней
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-medium">
                  <DollarSign className="w-4 h-4" />
                  от ${route.ratePerKg}/кг
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
