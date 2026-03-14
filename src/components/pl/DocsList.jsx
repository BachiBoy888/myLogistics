// src/components/pl/DocsList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ActionBtn from "../ui/ActionBtn";
import DocStatusBadge from "../ui/DocStatusBadge";
import { DOC_TYPES, ADDITIONAL_DOC_TYPE } from "../../constants/docs";
import {
  listPLDocs,
  uploadPLDoc,
  updatePLDoc,
  deletePLDoc,
} from "../../api/client";

// База API
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

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

export default function DocsList({ pl, onUpdate, onCountLoaded }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [uploadType, setUploadType] = useState("invoice");

  // Additional documents upload state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [additionalName, setAdditionalName] = useState("");
  const [additionalFile, setAdditionalFile] = useState(null);
  const [additionalUploading, setAdditionalUploading] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const abortRef = useRef(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const lastLoadAt = useRef(0); // кулдаун

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const currentPLId = pl?.id ?? null;

  async function refresh(force = false) {
    if (!currentPLId) return;

    const now = Date.now();
    if (!force && now - lastLoadAt.current < 1500) return; // 1.5s кулдаун
    lastLoadAt.current = now;

    if (inFlight.current) return;
    inFlight.current = true;

    setErr("");
    setLoading(true);

    // отмена предыдущего запроса
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const list = await listPLDocs(currentPLId);
      if (!mounted.current) return;
      const docsList = Array.isArray(list) ? list : [];
      setDocs(docsList);
      onCountLoaded?.(docsList.length);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.warn("[DocsList] load error", e);
        if (mounted.current) setErr(e.message || "Не удалось загрузить документы");
      }
    } finally {
      if (mounted.current) setLoading(false);
      inFlight.current = false;
    }
  }

  // Загружаем ТОЛЬКО при изменении pl.id
  useEffect(() => {
    if (currentPLId) {
      lastLoadAt.current = 0;
      refresh(true); // первая загрузка для этого PL
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPLId]);

  // Separate docs into required and additional
  const { requiredDocs, additionalDocs } = useMemo(() => {
    const byType = new Map();
    const additional = [];
    
    (docs || []).forEach((d) => {
      if (d.docType === ADDITIONAL_DOC_TYPE) {
        additional.push(d);
      } else {
        byType.set(d.docType, d);
      }
    });
    
    return { requiredDocs: byType, additionalDocs: additional };
  }, [docs]);

  const startUpload = (type) => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // сброс
    if (!f || !currentPLId) return;

    try {
      await uploadPLDoc(currentPLId, { file: f, doc_type: uploadType });
      await refresh(true); // просто перечитать список
    } catch (e) {
      console.error("[DocsList] upload error", e);
      setErr(e.message || "Ошибка загрузки файла");
    }
  };

  // Additional document upload handlers
  const openAddDialog = () => {
    setAdditionalName("");
    setAdditionalFile(null);
    setShowAddDialog(true);
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setAdditionalName("");
    setAdditionalFile(null);
  };

  const onPickAdditionalFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setAdditionalFile(f);
    }
  };

  const uploadAdditionalDoc = async () => {
    if (!currentPLId || !additionalFile || !additionalName.trim()) {
      setErr("Необходимо указать название документа и выбрать файл");
      return;
    }

    setAdditionalUploading(true);
    setErr("");

    try {
      await uploadPLDoc(currentPLId, {
        file: additionalFile,
        doc_type: ADDITIONAL_DOC_TYPE,
        name: additionalName.trim(),
      });
      await refresh(true);
      closeAddDialog();
    } catch (e) {
      console.error("[DocsList] additional upload error", e);
      setErr(e.message || "Ошибка загрузки документа");
    } finally {
      setAdditionalUploading(false);
    }
  };

  const setStatus = async (docId, uiStatus) => {
    if (!currentPLId) return;
    try {
      await updatePLDoc(currentPLId, docId, { status: toServerStatus(uiStatus) });
      await refresh(true);
    } catch (e) {
      console.error("[DocsList] update error", e);
      setErr(e.message || "Ошибка обновления статуса");
    }
  };

  const removeDoc = async (docId) => {
    if (!currentPLId) return;
    if (!confirm("Удалить документ?")) return;
    try {
      await deletePLDoc(currentPLId, docId);
      // локально выкидываем без дополнительного запроса
      setDocs((prev) => (Array.isArray(prev) ? prev.filter((d) => d.id !== docId) : []));
    } catch (e) {
      console.error("[DocsList] delete error", e);
      setErr(e.message || "Ошибка удаления документа");
    }
  };

  const downloadDoc = (doc) => {
    const url = `${API}/pl/${pl.id}/docs/${doc.id}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} />
      <input ref={additionalFileInputRef} type="file" className="hidden" onChange={onPickAdditionalFile} />

      {err && <div className="text-sm text-rose-600">{err}</div>}
      {loading && <div className="text-sm text-gray-500">Загрузка…</div>}

      {/* ==================== SECTION 1: REQUIRED DOCUMENTS ==================== */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Обязательные документы</h3>
        
        {DOC_TYPES.map(({ type, title, hint }) => {
          const doc = requiredDocs.get(type) || null;
          const uiStatus = doc ? toUIStatus(doc.status) : null;

          const previewUrl = doc ? `${API}/pl/${pl.id}/docs/${doc.id}/preview` : "";
          const sizeKb =
            doc && Number.isFinite(Number(doc.sizeBytes))
              ? `${Math.round(Number(doc.sizeBytes) / 1024)} KB`
              : "";

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
                    <DocStatusBadge doc={{ id: doc.id, type, status: uiStatus }} plStatus={pl.status} />
                    <div className="relative">
                      <button
                        className="px-2 py-1 border rounded-lg hover:bg-gray-50"
                        onClick={() => setMenuOpenId((v) => (v === doc.id ? null : doc.id))}
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
      </div>

      {/* ==================== SECTION 2: ADDITIONAL DOCUMENTS ==================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Дополнительные документы</h3>
          <button
            onClick={openAddDialog}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить документ
          </button>
        </div>

        {additionalDocs.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Нет дополнительных документов
          </div>
        ) : (
          <div className="space-y-2">
            {additionalDocs.map((doc) => {
              const previewUrl = `${API}/pl/${pl.id}/docs/${doc.id}/preview`;
              const sizeKb = Number.isFinite(Number(doc.sizeBytes))
                ? `${Math.round(Number(doc.sizeBytes) / 1024)} KB`
                : "";

              return (
                <div key={doc.id} className="rounded-xl border bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        <span className="font-medium">{doc.fileName}</span>
                        {sizeKb && <span className="text-gray-400"> • {sizeKb}</span>}
                        <span className="text-gray-400"> • {formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50"
                        onClick={() =>
                          setPreviewDoc({
                            id: doc.id,
                            url: previewUrl,
                            name: doc.name,
                            mime: doc.mimeType,
                          })
                        }
                      >
                        Открыть
                      </button>
                      <button
                        className="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50"
                        onClick={() => downloadDoc(doc)}
                      >
                        Скачать
                      </button>
                      <button
                        className="px-2 py-1 text-sm border rounded-lg hover:bg-rose-50 text-rose-600"
                        onClick={() => removeDoc(doc.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== ADD ADDITIONAL DOCUMENT DIALOG ==================== */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeAddDialog}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Добавить документ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название документа <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={additionalName}
                  onChange={(e) => setAdditionalName(e.target.value)}
                  placeholder="Например: Сертификат происхождения"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Файл <span className="text-rose-500">*</span>
                </label>
                {additionalFile ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm truncate flex-1">{additionalFile.name}</span>
                    <button
                      onClick={() => setAdditionalFile(null)}
                      className="text-sm text-rose-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => additionalFileInputRef.current?.click()}
                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Выбрать файл
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeAddDialog}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={additionalUploading}
              >
                Отмена
              </button>
              <button
                onClick={uploadAdditionalDoc}
                disabled={!additionalName.trim() || !additionalFile || additionalUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {additionalUploading ? "Загрузка…" : "Загрузить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PREVIEW OVERLAY ==================== */}
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
                  href={`${API}/pl/${pl.id}/docs/${previewDoc.id}/download`}
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
