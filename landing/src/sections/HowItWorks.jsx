import React from "react";
import { Send, CheckCircle, Truck, PackageCheck } from "lucide-react";
import { HOW_IT_WORKS } from "../config/content.js";

const IconMap = {
  send: Send,
  "check-circle": CheckCircle,
  truck: Truck,
  "package-check": PackageCheck,
};

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Как это работает
          </h2>
          <p className="text-lg text-gray-600">
            Простой процесс доставки из Китая в 4 шага
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = IconMap[step.icon];
            return (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-blue-200" />
                )}
                
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
