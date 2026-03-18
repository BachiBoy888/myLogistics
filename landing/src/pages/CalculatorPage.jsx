import React from "react";
import Layout from "../components/Layout.jsx";
import Calculator from "../sections/Calculator.jsx";
import FAQ from "../sections/FAQ.jsx";
import CTABlock from "../sections/CTABlock.jsx";
import SEO from "../config/seo.js";

export const metadata = SEO.pages.calculator;

export default function CalculatorPage() {
  return (
    <Layout pageName="calculator">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Калькулятор доставки из Китая
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Рассчитайте стоимость доставки груза онлайн. Укажите вес и габариты — 
            получите ориентировочную цу и сроки.
          </p>
        </div>
      </section>

      <Calculator />

      {/* How Calculation Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Как рассчитывается стоимость
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 font-bold">1</div>
              <h3 className="font-semibold text-gray-900 mb-2">Вес груза</h3>
              <p className="text-gray-600 text-sm">Указываете фактический вес груза в килограммах</p>
            </div>
            
            <div className="bg-white rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 font-bold">2</div>
              <h3 className="font-semibold text-gray-900 mb-2">Объемный вес</h3>
              <p className="text-gray-600 text-sm">Считаем по формуле: длина × ширина × высота / 6000</p>
            </div>
            
            <div className="bg-white rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 font-bold">3</div>
              <h3 className="font-semibold text-gray-900 mb-2">Итоговая цена</h3>
              <p className="text-gray-600 text-sm">Берется больший из двух весов, умножается на ставку</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-gray-700">
            <strong>Примечание:</strong> Ориентировочная стоимость может отличаться от финальной. 
            Точный расчет предоставляется менеджером после проверки параметров груза.
          </div>
        </div>
      </section>

      <FAQ />
      <CTABlock showCalculatorButton={false} />
    </Layout>
  );
}
