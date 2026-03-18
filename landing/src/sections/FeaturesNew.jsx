import React from "react";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  {
    title: "Проверка · Фотоотчёт · Переупаковка · Страхование",
    description: "Фото при получении на складе. Проверка на брак. Переупаковка для безопасной доставки.",
    cta: "Посмотреть пример отчёта",
  },
  {
    title: "Страхование · Жёсткая упаковка · Крепление · Контроль температуры",
    description: "Работаем с хрупким, тяжёлым и ценным грузом. Страховка включена в базовый тариф.",
    cta: "Уточнить условия",
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {FEATURES.map((feature, index) => (
            <div key={index} className="border-t border-gray-200 pt-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 uppercase tracking-tight mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-4 max-w-2xl">
                {feature.description}
              </p>
              <button className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-600 transition-colors">
                {feature.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
