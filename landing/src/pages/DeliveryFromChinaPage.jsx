import React from "react";
import { MapPin, Truck, Plane, Package, Clock, Shield, CheckCircle } from "lucide-react";
import Layout from "../components/Layout.jsx";
import CTABlock from "../sections/CTABlock.jsx";
import SEO from "../config/seo.js";

export const metadata = SEO.pages.delivery;

export default function DeliveryFromChinaPage() {
  const features = [
    {
      icon: MapPin,
      title: "Основные маршруты",
      items: ["Гуанчжоу → Бишкек", "Иу → Бишкек", "Шэньчжэнь → Бишкек"],
    },
    {
      icon: Truck,
      title: "Автодоставка",
      items: ["Срок: 12-15 дней", "Стоимость: от $2.9/кг", "Для крупных партий"],
    },
    {
      icon: Plane,
      title: "Авиадоставка",
      items: ["Срок: 5-7 дней", "Стоимость: от $5.5/кг", "Для срочных грузов"],
    },
  ];

  return (
    <Layout pageName="delivery">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Доставка грузов из Китая в Бишкек
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Надежная доставка товаров из Гуанчжоу, Иу и Шэньчжэня. 
              Полный комплекс услуг: склад, консолидация, таможня, доставка.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/landing/calculator.html"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                Рассчитать стоимость
              </a>
              <a
                href="/landing/contacts.html"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
              >
                Связаться с нами
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Methods */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Способы доставки
            </h2>
            <p className="text-lg text-gray-600">
              Выберите оптимальный способ доставки для вашего бизнеса
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-gray-50 rounded-2xl p-8">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <ul className="space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Whom */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Для кого эта услуга
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Селлеры маркетплейсов", desc: "Wildberries, Ozon, Яндекс.Маркет" },
              { title: "Малый бизнес", desc: "Оптовые закупки для магазинов" },
              { title: "Стартаперы", desc: "Первые закупки для теста ниши" },
              { title: "Крупные импортеры", desc: "Регулярные объемные поставки" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Почему доставляют грузы с нами
              </h2>
              
              <div className="space-y-4">
                {[
                  { icon: Package, title: "Склад в Гуанчжоу", desc: "Бесплатное хранение до 30 дней" },
                  { icon: Clock, title: "Точные сроки", desc: "Доставка 12-15 дней без задержек" },
                  { icon: Shield, title: "Гарантия сохранности", desc: "Страхование и контроль качества" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Как начать работу</h3>
              
              <ol className="space-y-4">
                {[
                  "Оставьте заявку на расчет или напишите нам",
                  "Получите персональное предложение",
                  "Отправьте товар на наш склад в Китае",
                  "Получите груз в Бишкеке",
                ].map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
              
              <a
                href="/landing/calculator.html"
                className="mt-8 block w-full py-3 bg-blue-600 text-white text-center font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Рассчитать доставку
              </a>
            </div>
          </div>
        </div>
      </section>

      <CTABlock />
    </Layout>
  );
}
