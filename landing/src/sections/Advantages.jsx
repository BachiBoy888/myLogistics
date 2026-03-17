import React from "react";
import { Warehouse, Package, Camera, Truck, FileCheck, Shield } from "lucide-react";
import { ADVANTAGES } from "../config/content.js";

const IconMap = {
  warehouse: Warehouse,
  package: Package,
  camera: Camera,
  truck: Truck,
  "file-check": FileCheck,
  shield: Shield,
};

export default function Advantages() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Почему выбирают нас
          </h2>
          <p className="text-lg text-gray-600">
            Надежная доставка грузов из Китая с полным спектром услуг
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ADVANTAGES.map((advantage) => {
            const Icon = IconMap[advantage.icon];
            return (
              <div
                key={advantage.id}
                className="p-6 bg-gray-50 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {advantage.title}
                </h3>
                <p className="text-gray-600">{advantage.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
