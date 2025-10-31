// src/components/ui/DocStatusBadge.jsx
import React from "react";
import Chip from "./Chip";
import ProgressBar from "./ProgressBar";
import { percentForDoc } from "../../utils/readiness";

export default function DocStatusBadge({ doc, plStatus }) {
  const pct = percentForDoc(doc.status, plStatus);

  const map = {
    uploaded: { text: "Вложен (10%)", cls: "bg-gray-100 text-gray-800" },
    checked_by_logistic: { text: "Проверено (50%)", cls: "bg-amber-100 text-amber-700" },
    recheck_ok: { text: "Повторная проверка (100%)", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { text: "Отклонён (0%)", cls: "bg-rose-100 text-rose-700" },
  };

  const meta = map[doc.status] || { text: "Неизвестно", cls: "bg-gray-100 text-gray-800" };

  return (
    <div className="flex items-center gap-2">
      <Chip className={meta.cls}>{meta.text}</Chip>
      <div className="w-24">
        <ProgressBar value={pct} />
      </div>
      <span className="text-xs text-gray-600">{pct}%</span>
    </div>
  );
}