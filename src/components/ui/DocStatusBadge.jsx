// src/components/ui/DocStatusBadge.jsx
import React from "react";
import Chip from "./Chip";

export default function DocStatusBadge({ doc }) {
  const map = {
    uploaded: { text: "Вложен", cls: "bg-gray-100 text-gray-800" },
    checked_by_logistic: { text: "Проверено", cls: "bg-amber-100 text-amber-700" },
    recheck_ok: { text: "Повторная проверка", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { text: "Отклонён", cls: "bg-rose-100 text-rose-700" },
  };

  const meta = map[doc.status] || { text: "Неизвестно", cls: "bg-gray-100 text-gray-800" };

  return (
    <div className="flex items-center">
      <Chip className={meta.cls}>{meta.text}</Chip>
    </div>
  );
}