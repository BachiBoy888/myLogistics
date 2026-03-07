// src/components/import/ImportModal.jsx
// Модальное окно для импорта клиентов и PL из Excel

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_LABELS = {
  create: 'Создать',
  overwrite: 'Перезаписать',
  create_copy: 'Создать копию',
  skip: 'Пропустить',
};

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700 border-green-300',
  overwrite: 'bg-orange-100 text-orange-700 border-orange-300',
  create_copy: 'bg-blue-100 text-blue-700 border-blue-300',
  skip: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function ImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedClients, setExpandedClients] = useState(false);
  const [expandedPLs, setExpandedPLs] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Preview failed' }));
        throw new Error(err.error || err.detail || 'Preview failed');
      }
      
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    
    setApplying(true);
    setError(null);
    
    try {
      const res = await fetch('/api/import/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: preview.clients,
          pls: preview.pls,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Apply failed' }));
        throw new Error(err.error || err.detail || 'Apply failed');
      }
      
      const data = await res.json();
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const updateClientAction = (index, action) => {
    setPreview(prev => ({
      ...prev,
      clients: prev.clients.map((c, i) => i === index ? { ...c, action } : c),
    }));
  };

  const updatePLAction = (index, action) => {
    setPreview(prev => ({
      ...prev,
      pls: prev.pls.map((p, i) => i === index ? { ...p, action } : p),
    }));
  };

  const hasConflicts = preview?.clients?.some(c => c.type === 'conflict') || 
                       preview?.pls?.some(p => p.type === 'conflict');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            Импорт из Excel
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: File Upload */}
          {!preview && !result && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-300 mb-1">
                  {file ? file.name : 'Нажмите для выбора файла .xlsx'}
                </p>
                <p className="text-gray-500 text-sm">
                  Поддерживаются файлы Excel с колонками: Дата, Номер PL, Компания, Груз, Вес, Объём, Статус и др.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {file && (
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Анализ файла...' : 'Предпросмотр'}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Preview with Conflicts */}
          {preview && !result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Результат анализа</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-100">{preview.summary?.totalRows || 0}</div>
                    <div className="text-xs text-gray-400">Всего строк</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{preview.summary?.newClients || 0}</div>
                    <div className="text-xs text-green-300">Новых клиентов</div>
                  </div>
                  <div className="bg-orange-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-400">{preview.summary?.existingClients || 0}</div>
                    <div className="text-xs text-orange-300">Конфликтов клиентов</div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-400">{preview.summary?.newPLs || 0}</div>
                    <div className="text-xs text-blue-300">Новых PL</div>
                  </div>
                </div>
              </div>

              {/* Clients Section */}
              {preview.clients?.length > 0 && (
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    onClick={() => setExpandedClients(!expandedClients)}
                  >
                    <span className="font-medium text-gray-200">
                      Клиенты ({preview.clients.length})
                    </span>
                    {expandedClients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedClients && (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-gray-300">Имя</th>
                            <th className="text-left p-2 text-gray-300">Компания</th>
                            <th className="text-left p-2 text-gray-300">Статус</th>
                            <th className="text-left p-2 text-gray-300">Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.clients.map((c, idx) => (
                            <tr key={idx} className="border-t border-gray-700">
                              <td className="p-2 text-gray-200">{c.data.name}</td>
                              <td className="p-2 text-gray-400">{c.data.company || '—'}</td>
                              <td className="p-2">
                                {c.type === 'new' ? (
                                  <span className="inline-flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-3 h-3" /> Новый
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-orange-400">
                                    <AlertCircle className="w-3 h-3" /> 
                                    Конфликт ({c.matchType})
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <select
                                  value={c.action}
                                  onChange={(e) => updateClientAction(idx, e.target.value)}
                                  className={`text-xs rounded border px-2 py-1 ${ACTION_COLORS[c.action]}`}
                                >
                                  {c.type === 'new' ? (
                                    <option value="create">Создать</option>
                                  ) : (
                                    <>
                                      <option value="skip">Пропустить</option>
                                      <option value="overwrite">Перезаписать</option>
                                      <option value="create_copy">Создать копию</option>
                                    </>
                                  )}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PLs Section */}
              {preview.pls?.length > 0 && (
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    onClick={() => setExpandedPLs(!expandedPLs)}
                  >
                    <span className="font-medium text-gray-200">
                      PL ({preview.pls.length})
                    </span>
                    {expandedPLs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedPLs && (
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-gray-300">Номер</th>
                            <th className="text-left p-2 text-gray-300">Название</th>
                            <th className="text-left p-2 text-gray-300">Статус</th>
                            <th className="text-left p-2 text-gray-300">Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.pls.map((p, idx) => (
                            <tr key={idx} className="border-t border-gray-700">
                              <td className="p-2 text-gray-200">{p.data.plNumber || '—'}</td>
                              <td className="p-2 text-gray-400">{p.data.name}</td>
                              <td className="p-2">
                                {p.type === 'new' ? (
                                  <span className="inline-flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-3 h-3" /> Новый
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-orange-400">
                                    <AlertCircle className="w-3 h-3" /> Конфликт
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <select
                                  value={p.action}
                                  onChange={(e) => updatePLAction(idx, e.target.value)}
                                  className={`text-xs rounded border px-2 py-1 ${ACTION_COLORS[p.action]}`}
                                >
                                  {p.type === 'new' ? (
                                    <option value="create">Создать</option>
                                  ) : (
                                    <>
                                      <option value="skip">Пропустить</option>
                                      <option value="overwrite">Перезаписать</option>
                                      <option value="create_copy">Создать копию</option>
                                    </>
                                  )}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {hasConflicts && (
                <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-3 text-sm text-orange-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Обнаружены конфликты. Выберите действие для каждой конфликтной записи перед применением.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {result && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-100 mb-2">Импорт завершён!</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-300 mb-3">Клиенты</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-green-400">
                      <span>Создано:</span>
                      <span>{result.clients?.created?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-orange-400">
                      <span>Обновлено:</span>
                      <span>{result.clients?.updated?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Пропущено:</span>
                      <span>{result.clients?.skipped?.length || 0}</span>
                    </div>
                    {result.clients?.errors?.length > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Ошибок:</span>
                        <span>{result.clients.errors.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-300 mb-3">PL</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-green-400">
                      <span>Создано:</span>
                      <span>{result.pls?.created?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-orange-400">
                      <span>Обновлено:</span>
                      <span>{result.pls?.updated?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Пропущено:</span>
                      <span>{result.pls?.skipped?.length || 0}</span>
                    </div>
                    {result.pls?.errors?.length > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Ошибок:</span>
                        <span>{result.pls.errors.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          {result ? (
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Закрыть
            </button>
          ) : preview ? (
            <>
              <button
                onClick={() => setPreview(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Назад
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {applying ? 'Применение...' : 'Применить импорт'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
