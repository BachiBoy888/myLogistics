import React from "react";

const STEPS = [
  {
    num: "01",
    title: "Заявка и уточнение",
    description: "Опишите груз, маршрут и сроки. Мы рассчитаем стоимость за 10–15 минут.",
  },
  {
    num: "02",
    title: "Получение на складе в Китае",
    description: "Забираем с фабрики/рынка. Проверяем, фотографируем, упаковываем.",
  },
  {
    num: "03",
    title: "Доставка и таможня",
    description: "Авто/авия/мультимод. Таможенное оформление включено.",
  },
  {
    num: "04",
    title: "Выдача в Бишкеке",
    description: "Привезём на ваш склад или пункт выдачи. Оплата по факту.",
  },
];

export default function StepsSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            4 шага до получения груза
          </h2>
          <p className="text-gray-500">Прозрачный процесс от заявки до доставки.</p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className="relative">
              <div className="text-5xl font-black text-gray-200 mb-4">
                {step.num}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
