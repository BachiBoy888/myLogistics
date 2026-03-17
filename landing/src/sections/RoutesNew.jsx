import React from "react";
import { ArrowRight } from "lucide-react";

const ROUTES = [
  { city: "Гуанчжоу", en: "Guangzhou" },
  { city: "Иу", en: "Yiwu" },
  { city: "Шэньчжэнь", en: "Shenzhen" },
  { city: "Фошань", en: "Foshan" },
  { city: "Дунгуань", en: "Dongguan" },
];

export default function RoutesSection() {
  return (
    <section className="bg-white py-16 lg:py-24 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Авиа · Авто · Мультимодальные рейсы под ключ
          </p>
          <p className="text-gray-600 max-w-xl">
            Сроки фиксируем в договоре. Отслеживание на каждом этапе.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-600 transition-colors">
            Узнать маршруты
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cities */}
        <div className="flex flex-wrap gap-3">
          {ROUTES.map((route) => (
            <div
              key={route.en}
              className="px-6 py-3 bg-gray-100 rounded-full text-gray-900 font-medium hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {route.city}
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="mt-8 text-gray-600 max-w-2xl">
          Заберём груз с фабрики или рынка. Проверим комплектацию. Упакуем под ваш бренд.
        </p>

        <button className="mt-4 inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-600 transition-colors">
          Запросить сборку
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
