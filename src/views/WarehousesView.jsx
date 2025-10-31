// src/views/WarehousesView.jsx
import React, { useMemo } from "react";
import Chip from "../components/ui/Chip.jsx";
import { Truck } from "lucide-react";

export default function WarehousesView({ pls, warehouses }) {
  // считаем использование складов по PL
  const usage = useMemo(() => {
    const countById = pls.reduce((acc, pl) => {
      if (pl?.fob_warehouse_id) {
        acc[pl.fob_warehouse_id] = (acc[pl.fob_warehouse_id] || 0) + 1;
      }
      return acc;
    }, {});

    return (warehouses || []).map((w) => ({
      ...w,
      count: countById[w.id] || 0,
      recentPLs: pls
        .filter((pl) => pl.fob_warehouse_id === w.id)
        .slice(0, 5)
        .map((pl) => pl.pl_number),
    }));
  }, [pls, warehouses]);

  return (
    <main className="max-w-7xl mx-auto p-4">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usage.map((w) => (
          <div key={w.id} className="border rounded-2xl p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{w.name}</div>
              <Chip className="bg-purple-100 text-purple-700">FOB</Chip>
            </div>
            <div className="text-sm text-gray-600 mt-1">{w.address}</div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-gray-500" />
              <span>PL с этим складом: </span>
              <span className="font-medium">{w.count}</span>
            </div>

            {w.recentPLs?.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Последние: {w.recentPLs.join(", ")}
              </div>
            )}
          </div>
        ))}

        {usage.length === 0 && (
          <div className="text-sm text-gray-500">Склады не заданы</div>
        )}
      </section>
    </main>
  );
}