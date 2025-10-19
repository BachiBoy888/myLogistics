// src/components/LoadingScreen.jsx
import React from "react";
import truckImg from "../assets/truck2.png"; // <- картинка из src/assets

/**
 * Лоадер с статичным PNG-грузовиком и «бегущей» дорогой справа-налево.
 * Никаких внешних стилей не требуется — keyframes внутри.
 */
export default function LoadingScreen({ label = "Загрузка данных…" }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[#FAF3DD] px-4">
      <div className="w-full max-w-[680px]">
        {/* Сцена */}
        <div
          className="relative h-[540px] rounded-2xl overflow-hidden"
          style={{ background: "#FAF3DD" }} 
        >
          {/* Дорога */}
          <div className="absolute bottom-16 left-0 right-0 h-14">
            <div className="absolute inset-0 bg-black/85 rounded-t-[14px]" />
            {/* Бегущая разметка */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[4px] overflow-hidden">
              <div
                className="w-[200%] h-full animate-ml-road"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, white 0 40px, transparent 40px 80px)",
                  backgroundSize: "80px 4px",
                }}
              />
            </div>
          </div>

          {/* Статичный PNG грузовика */}
          <img
            src={truckImg}
            alt="PROLIFE truck"
            className="absolute bottom-[40px] left-1/2 -translate-x-1/2 select-none pointer-events-none"
            style={{
              width: "min(520px, 90vw)", // не растягиваем шире исходника
              imageRendering: "auto",
            }}
          />
        </div>

        <p className="mt-4 text-center text-gray-700 font-medium">{label}</p>
      </div>

      {/* Локальные keyframes */}
      <style>{`
        @keyframes ml-road {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-ml-road { animation: ml-road 1.1s linear infinite; }
      `}</style>
    </div>
  );
}