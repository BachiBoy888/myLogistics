import React, { useEffect, useState } from "react";
import { listPLEvents } from "../../api/client.js";

export default function PLEvents({ plId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await listPLEvents(plId);
        if (!ignore) setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [plId]);

  return (
    <div className="border rounded-xl bg-white">
      <div className="px-3 py-2 border-b text-[11px] uppercase tracking-wide text-gray-500">
        Хронология
      </div>
      {loading && <div className="p-3 text-xs text-gray-500">Загрузка…</div>}
      {!loading && items.length === 0 && (
        <div className="p-3 text-xs text-gray-400">Пока пусто</div>
      )}
      <div className="divide-y">
        {items.map(ev => (
          <div key={ev.id} className="p-3 text-[12px] leading-5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-gray-800">{humanEvent(ev)}</div>
              <div className="text-[11px] text-gray-500">
                {new Date(ev.createdAt || ev.created_at).toLocaleString()}
              </div>
            </div>
            {ev.message && <div className="text-gray-600">{ev.message}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function humanEvent(ev) {
  const t = ev.type || "";
  if (t === "pl.created") return "Создание";
  if (t === "pl.status_changed") return "Смена статуса";
  if (t === "pl.responsible_changed") return "Ответственный";
  if (t === "pl.doc_uploaded") return "Загрузка документа";
  if (t === "pl.doc_status_changed") return "Статус документа";
  if (t === "pl.doc_deleted") return "Удаление документа";
  if (t === "pl.added_to_consolidation") return "Добавлен в консолидацию";
  if (t === "pl.removed_from_consolidation") return "Исключён из консолидации";
  return t;
}