// src/components/LoadingScreen.jsx
import React from "react";
import truck from "../assets/truck2.png";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#EAEAEA]">
      <style>{`
        @keyframes moveLines {
          0% { background-position-x: 0; }
          100% { background-position-x: -400px; }
        }
          @keyframes truckBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

        .asphalt {
          position: relative;
          background: #2b2b2b;
          background-image:
            linear-gradient(
              to right,
              #2b2b2b 0%,
              #2b2b2b 40%,
              #303030 40%,
              #303030 60%,
              #2b2b2b 60%,
              #2b2b2b 100%
            );
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
          overflow: hidden;
        }

        .asphalt::before {
          /* белые полосы */
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          height: 6px;
          background-image: repeating-linear-gradient(
            to right,
            white 0 60px,
            transparent 60px 120px
          );
          opacity: 0.8;
          animation: moveLines 0.8s linear infinite;
        }

        .asphalt::after {
          /* боковые жёлтые линии */
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background-image:
            linear-gradient(to bottom, #facc15 4px, transparent 4px),
            linear-gradient(to top, #facc15 4px, transparent 4px);
          background-repeat: no-repeat;
          background-position: top, bottom;
          background-size: 100% 4px;
          pointer-events: none;
          opacity: 0.9;
        }
      `}</style>

      {/* Грузовик */}
<div className="flex items-center justify-center mt-8 relative z-10">
  <img
    src={truck}
    alt="Грузовик"
    className="w-[440px] max-w-[95vw] h-auto object-contain drop-shadow-2xl select-none animate-[truckBounce_1s_ease-in-out_infinite] -mb-20"
    draggable="false"
  />
</div>

{/* Асфальтированная дорога */}
<div className="w-[90%] max-w-2xl h-20 rounded-xl asphalt relative z-0"></div>

{/* Подпись */}
<div className="mt-6 text-center text-gray-700 text-lg font-medium">
  Доставляем с радостью
</div>
    </div>
  );
}