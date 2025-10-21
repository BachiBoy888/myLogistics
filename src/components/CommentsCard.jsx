// src/components/CommentsCard.jsx
import React, { useEffect, useState } from "react";
import { listPLComments, addPLComment, deletePLComment } from "../api/client.js";

export default function CommentsCard({ pl, onAppend }) {
  const plId = pl.id;
  const [author, setAuthor] = useState("Логист");
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await listPLComments(plId);
        if (!ignore) setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [plId]);

  async function submit() {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      const created = await addPLComment(plId, { author: author.trim() || "Логист", text: t });
      setItems(prev => [...prev, created]);
      setText("");
      onAppend?.(created); // если нужно синкать PLCard родителя
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (removing) return;
    setRemoving(id);
    try {
      await deletePLComment(plId, id);
      setItems(prev => prev.filter(c => c.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-xl divide-y bg-white">
        {loading && <div className="p-3 text-sm text-gray-500">Загрузка…</div>}
        {!loading && items.length === 0 && (
          <div className="p-3 text-sm text-gray-500">Комментариев пока нет</div>
        )}
        {items.map((c) => (
          <div key={c.id} className="p-3 text-sm flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">{c.author}</div>
                <div className="text-xs text-gray-500">
                  {new Date(c.createdAt || c.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 text-gray-700 break-words whitespace-pre-wrap">{c.body || c.text}</div>
            </div>
            <button
              className="text-rose-600 text-xs underline shrink-0"
              onClick={() => remove(c.id)}
              disabled={removing === c.id}
              title="Удалить комментарий"
            >
              {removing === c.id ? "Удаление…" : "Удалить"}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <input
          className="border rounded-lg px-3 py-2 min-h-[44px]"
          placeholder="Ваше имя"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <textarea
          className="border rounded-lg px-3 py-2 min-h-[88px]"
          rows={3}
          placeholder="Новый комментарий"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            className={`rounded-lg px-3 py-3 min-h-[44px] text-sm ${text.trim() ? "bg-black text-white" : "bg-gray-200 text-gray-500"}`}
            onClick={submit}
            disabled={!text.trim() || saving}
          >
            {saving ? "Сохранение…" : "Добавить комментарий"}
          </button>
          <span className="text-xs text-gray-500">Автор и время фиксируются автоматически</span>
        </div>
      </div>
    </div>
  );
}