import React from "react";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    title: "Доставка сборных грузов",
    description: "Оптимальное решение для небольших партий. Консолидация на нашем складе в Китае.",
  },
  {
    title: "Выкуп с 1688/Taobao",
    description: "Помогаем с выкупом товаров с китайских площадок. Проверка продавцов и качества.",
  },
  {
    title: "Проверка и фотоотчёт",
    description: "Детальная проверка товара на складе. Фото и видео каждой позиции.",
  },
  {
    title: "Переупаковка и маркировка",
    description: "Профессиональная упаковка под ваш бренд. Маркировка и подготовка к продаже.",
  },
  {
    title: "Таможенное оформление",
    description: "Полное сопровождение таможенной очистки. Документы и декларирование.",
  },
  {
    title: "Страхование груза",
    description: "Страхование от повреждений и потери. Включено в базовый тариф.",
  },
];

export default function ServicesGrid() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Услуги
          </h2>
          <p className="text-gray-500">Всё, что нужно для импорта из Китая в одном окне.</p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, index) => (
            <div 
              key={index} 
              className="group p-6 border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-lg transition-all cursor-pointer"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {service.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {service.description}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                Подробнее
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
