// src/components/pl/BillTab.jsx
// Вкладка "Счет" - загрузка и просмотр счета на оплату (отдельно от инвойса)
import React, { useRef, useState } from "react";
import { Upload, FileText, Download, X, Eye } from "lucide-react";
import { uploadPLDoc, deletePLDoc } from "../../api/client.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

export default function BillTab({ pl, billDoc, setBillDoc, setBillCount, loading }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pl?.id) return;

    setUploading(true);
    setError("");

    try {
      // Используем отдельный тип 'bill' - это документ оплаты, не инвойс
      const result = await uploadPLDoc(pl.id, { 
        file, 
        doc_type: "bill" 
      });
      setBillDoc(result);
      setBillCount(1);
    } catch (err) {
      console.error("[BillTab] upload error", err);
      setError(err.message || "Ошибка загрузки файла");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!billDoc || !pl?.id) return;
    if (!confirm("Удалить счет?")) return;

    try {
      await deletePLDoc(pl.id, billDoc.id);
      setBillDoc(null);
      setBillCount(0);
    } catch (err) {
      console.error("[BillTab] delete error", err);
      setError(err.message || "Ошибка удаления");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Загрузка…</div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</div>
      )}

      {!billDoc ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">Счет не загружен</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Загрузка…" : "Загрузить счет"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info card */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{billDoc.fileName}</div>
              <div className="text-sm text-gray-500">
                {formatSize(billDoc.sizeBytes)} • {formatDate(billDoc.uploadedAt)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Открыть
            </button>

            <a
              href={`${API}/pl/${pl.id}/docs/${billDoc.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Скачать
            </a>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Загрузка…" : "Заменить"}
            </button>

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-rose-600 hover:bg-rose-50"
            >
              <X className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewOpen && billDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold truncate">{billDoc.fileName}</div>
              <div className="flex items-center gap-2">
                <a
                  href={`${API}/pl/${pl.id}/docs/${billDoc.id}/download`}
                  className="text-sm underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать
                </a>
                <button
                  className="px-2 py-1 border rounded-lg"
                  onClick={() => setPreviewOpen(false)}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <iframe
              title="bill-preview"
              src={`${API}/pl/${pl.id}/docs/${billDoc.id}/preview`}
              className="w-full h-[calc(90vh-56px)] border rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
