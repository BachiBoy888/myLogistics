import React from "react";

const TESTIMONIALS = [
  {
    quote: "Доставили за 11 дней, как и обещали. Проверка на складе сэкономила нам время и деньги.",
    name: "Айгуль К.",
    role: "Магазин детской одежды",
  },
  {
    quote: "Удобно, что таможня включена. Не пришлось искать отдельного брокера.",
    name: "Данияр Т.",
    role: "Wildberries seller",
  },
  {
    quote: "Выкупили партию с 1688. Всё проверили, переупаковали, доставили целым.",
    name: "Сергей М.",
    role: "Импортёр электроники",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-gray-500">Работаем с предпринимателями, магазинами и маркетплейсами.</p>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((item, index) => (
            <div key={index} className="bg-white p-6 rounded-xl">
              <blockquote className="text-gray-900 text-lg font-medium mb-6 leading-relaxed">
                "{item.quote}"
              </blockquote>
              <div>
                <p className="font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
