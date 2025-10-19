// src/components/pl/DocsList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ActionBtn from "../ui/ActionBtn";
import DocStatusBadge from "../ui/DocStatusBadge";
import { DOC_TYPES } from "../../constants/docs";
import {
  listPLDocs,
  uploadPLDoc,
  updatePLDoc,
  deletePLDoc,
} from "../../api/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const FILE_HOST = API_BASE.replace(/\/api$/, "");

// === Маппинги статусов ===
function toUIStatus(serverStatus) {
  switch (serverStatus) {
    case "pending": return "uploaded";            // 10%
    case "reviewed": return "checked_by_logistic";// 50%
    case "approved": return "recheck_ok";         // 100%
    case "rejected": return "rejected";           // 0%
    default: return "uploaded";
  }
}
function toServerStatus(uiStatus) {
  switch (uiStatus) {
    case "uploaded": return "pending";
    case "checked_by_logistic": return "reviewed";
    case "recheck_ok": return "approved";
    case "rejected": return "rejected";
    default: return "pending";
  }
}

// Сводка для PL
function buildSummary(docs = []) {
  return docs.map((d) => ({
    id: d.id,
    type: d.docType,
    status: toUIStatus(d.status),
    fileName: d.fileName,
  }));
}

export default function DocsList({ pl, onUpdate }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [uploadType, setUploadType] = useState("invoice");

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const fileInputRef = useRef(null);
  const currentPLId = pl?.id;

  async function refresh() {
    if (!currentPLId) return;
    setLoading(true);
    setErr("");
    try {
      const list = await listPLDocs(currentPLId);
      const safe = Array.isArray(list) ? list : [];
      setDocs(safe);
      onUpdate?.({ docs: buildSummary(safe) });
    } catch (e) {
      setErr(e.message || "Не удалось загрузить документы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [currentPLId]);

  const byType = useMemo(() => {
    const map = new Map();
    (docs || []).forEach((d) => map.set(d.docType, d));
    return map;
  }, [docs]);

  const startUpload = (type) => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !currentPLId) return;
    try {
      await uploadPLDoc(currentPLId, {
        file: f,
        doc_type: uploadType,
      });
      await refresh();
    } catch (e) {
      setErr(e.message || "Ошибка загрузки файла");
    } finally {
      e.target.value = "";
    }
  };

  const setStatus = async (docId, uiStatus) => {
    if (!currentPLId) return;
    try {
      await updatePLDoc(currentPLId, docId, { status: toServerStatus(uiStatus) });
      await refresh();
    } catch (e) {
      setErr(e.message || "Ошибка обновления статуса");
    }
  };

  const removeDoc = async (docId) => {
    if (!currentPLId) return;
    if (!confirm("Удалить документ?")) return;
    try {
      await deletePLDoc(currentPLId, docId);
      await refresh();
    } catch (e) {
      setErr(e.message || "Ошибка удаления документа");
    }
  };

  const downloadDoc = (doc) => {
    const url = `${API_BASE}/pl/${pl.id}/docs/${doc.id}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      {/* скрытый file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onPickFile}
      />

      {err && <div className="text-sm text-rose-600">{err}</div>}
      {loading && <div className="text-sm text-gray-500">Загрузка…</div>}

      {DOC_TYPES.map(({ type, title, hint }) => {
        const doc = byType.get(type) || null;
        const uiStatus = doc ? toUIStatus(doc.status) : null;

        // URL для превью и для скачивания
        const previewUrl = doc ? `${API_BASE}/pl/${pl.id}/docs/${doc.id}/preview` : "";
        const sizeKb =
          doc && Number.isFinite(Number(doc.sizeBytes))
            ? `${Math.round(Number(doc.sizeBytes) / 1024)} KB`
            : "";

        // последовательность кнопок:
        const showUploadBtn = !doc;
        const showCheckedBtn = uiStatus === "uploaded";
        const showRecheckBtn = uiStatus === "checked_by_logistic";

        return (
          <div key={type} className="rounded-xl border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{hint}</div>

                {doc && (
                  <div className="mt-1 text-xs text-gray-600">
                    <div className="break-all">
                      <span className="font-medium">{doc.fileName}</span>{" "}
                      {sizeKb && <span className="text-gray-400">• {sizeKb}</span>}
                    </div>
                    <button
                      className="underline"
                      onClick={() =>
                        setPreviewDoc({
                          id: doc.id,
                          url: previewUrl,
                          name: doc.fileName,
                          mime: doc.mimeType,
                        })
                      }
                    >
                      Открыть файл
                    </button>
                  </div>
                )}
              </div>

              {doc && (
                <div className="flex items-center gap-2">
                  <DocStatusBadge
                    doc={{ id: doc.id, type, status: uiStatus }}
                    plStatus={pl.status}
                  />

                  {/* Меню троеточие */}
                  <div className="relative">
                    <button
                      className="px-2 py-1 border rounded-lg hover:bg-gray-50"
                      onClick={() =>
                        setMenuOpenId((v) => (v === doc.id ? null : doc.id))
                      }
                    >
                      ⋯
                    </button>
                    {menuOpenId === doc.id && (
                      <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg z-10 w-48">
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            setMenuOpenId(null);
                            downloadDoc(doc);
                          }}
                        >
                          Скачать файл
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-amber-700"
                          onClick={async () => {
                            setMenuOpenId(null);
                            await setStatus(doc.id, "rejected");
                          }}
                        >
                          Отклонить
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-rose-600"
                          onClick={async () => {
                            setMenuOpenId(null);
                            await removeDoc(doc.id);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {showUploadBtn && (
                <ActionBtn onClick={() => startUpload(type)}>
                  Вложить документ
                </ActionBtn>
              )}

              {doc && (
                <ActionBtn onClick={() => startUpload(type)}>
                  Заменить файл
                </ActionBtn>
              )}

              {doc && showCheckedBtn && (
                <ActionBtn onClick={() => setStatus(doc.id, "checked_by_logistic")}>
                  Проверено
                </ActionBtn>
              )}

              {doc && showRecheckBtn && (
                <ActionBtn onClick={() => setStatus(doc.id, "recheck_ok")}>
                  Повторная проверка (100%)
                </ActionBtn>
              )}
            </div>
          </div>
        );
      })}

      {/* Preview overlay */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreviewDoc(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold truncate">{previewDoc.name}</div>
              <div className="flex items-center gap-2">
                <a
                  href={`${API_BASE}/pl/${pl.id}/docs/${previewDoc.id}/download`}
                  className="text-sm underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать
                </a>
                <button
                  className="px-2 py-1 border rounded-lg"
                  onClick={() => setPreviewDoc(null)}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <iframe
              title="preview"
              src={previewDoc.url}
              className="w-full h-[calc(90vh-56px)] border rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}