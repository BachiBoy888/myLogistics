// src/components/pl/NewPLModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { searchClients } from "../../api/client.js";

// нормализация для сравнения
const norm = (s = "") =>
  (s.normalize?.("NFKD") || String(s)).toLowerCase().trim();

// простая подсветка вхождений
function Highlight({ text, query }) {
  const q = norm(query);
  const t = String(text || "");
  if (!q || q.length < 2) return t;

  // Ищем индекс с учётом norm
  const raw = t;
  const nRaw = norm(raw);
  const idx = nRaw.indexOf(q);
  if (idx === -1) return raw;

  // Попытка сопоставить индексы по длине query
  // Берём срез по длине исходной query (не норм.)
  const before = raw.slice(0, idx);
  const match = raw.slice(idx, idx + query.length);
  const after = raw.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-100">{match}</mark>
      {after}
    </>
  );
}

export default function NewPLModal({
  onClose,
  onCreate, // (payload) => Promise<void>
  clientOptions = [], // оставим для бэкапа, но используем новый async-поиск
  warehouses = [], // [{id, name, address}]
}) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState(""); // текст, что печатает юзер
  const [selectedClient, setSelectedClient] = useState(null); // {id, name} если выбран из подсказок
  const [incoterm, setIncoterm] = useState("EXW"); // EXW | FOB
  const [exwAddress, setExwAddress] = useState("");
  const [fobWhId, setFobWhId] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [places, setPlaces] = useState("1");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // состояние подсказок
  const [suggestions, setSuggestions] = useState([]);
  const [openDD, setOpenDD] = useState(false);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [hasExact, setHasExact] = useState(false);

  const inputRef = useRef(null);
  const ddRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // сброс при открытии
    setTitle("");
    setClient("");
    setSelectedClient(null);
    setIncoterm("EXW");
    setExwAddress("");
    setFobWhId("");
    setWeight("");
    setVolume("");
    setPlaces("1");
    setSaving(false);
    setErr("");
  }, []);

  // при вводе — сбрасываем «выбранного» клиента
  function onClientChange(v) {
    setClient(v);
    setSelectedClient(null);
    setOpenDD(true);
  }

  // дебаунс-поиск по имени (начинаем с 2 символов), лимит 10, флажок точного совпадения
  useEffect(() => {
    const q = client.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setOpenDD(false);
      setLoadingSugg(false);
      setHasExact(false);
      return;
    }
    setLoadingSugg(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchClients(q);
        const limited = Array.isArray(found) ? found.slice(0, 10) : [];
        setSuggestions(limited);
        setOpenDD(true);
        const exact = limited.some((c) => norm(c.name) === norm(q));
        setHasExact(exact);
      } catch {
        setSuggestions([]);
        setOpenDD(false);
        setHasExact(false);
      } finally {
        setLoadingSugg(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [client]);

  // клики вне — закрыть дропдаун
  useEffect(() => {
    function onDocClick(e) {
      const inInput = inputRef.current && inputRef.current.contains(e.target);
      const inDD = ddRef.current && ddRef.current.contains(e.target);
      if (!inInput && !inDD) setOpenDD(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // выбор из подсказки
  function pickSuggestion(s) {
    setClient(s.name || "");
    setSelectedClient({ id: s.id, name: s.name });
    setOpenDD(false);
    setHighlight(-1);
  }

  // клавиатура в поле клиента
  function onClientKeyDown(e) {
    if (!openDD) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min((suggestions?.length || 0) - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(-1, h - 1));
    } else if (e.key === "Enter") {
      // если есть выделенная подсказка — выбираем её
      if (highlight >= 0 && suggestions[highlight]) {
        e.preventDefault();
        pickSuggestion(suggestions[highlight]);
        return;
      }
      // если точного совпадения нет — оставляем ввод, дальше submit создаст нового
      if (!hasExact) {
        setSelectedClient(null);
        setOpenDD(false);
        return; // форма обработает сабмит
      }
    } else if (e.key === "Escape") {
      setOpenDD(false);
    } else if (e.key === "Tab") {
      if (highlight >= 0 && suggestions[highlight]) {
        pickSuggestion(suggestions[highlight]);
      }
    }
  }

  const canSave =
    title.trim() && client.trim() && (incoterm === "EXW" ? true : !!fobWhId);

  async function submit(e) {
    e?.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setErr("");

    try {
      await onCreate?.({
        // передаём и текст, и id если выбран из подсказок
        client: client.trim(),
        client_id: selectedClient?.id ?? null,

        title: title.trim(),
        weight_kg: weight ? Number(weight) : null,
        volume_cbm: volume ? Number(volume) : null,
        places: places ? Number(places) : 1,
        incoterm,
        exw_address: exwAddress.trim(),
        fob_wh_id: fobWhId ? Number(fobWhId) : null,
      });
    } catch (e) {
      setErr(e?.message || "Не удалось создать PL");
      setSaving(false);
      return;
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Новый PL</div>
          <button
            className="text-sm px-3 py-1.5 rounded-lg border"
            onClick={onClose}
            disabled={saving}
          >
            Закрыть
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Название груза</div>
              <input
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Электроника"
                autoFocus
              />
            </label>

            <label className="block relative">
              <div className="text-sm text-neutral-700 mb-1">Клиент</div>
              <input
                ref={inputRef}
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={client}
                onChange={(e) => onClientChange(e.target.value)}
                onKeyDown={onClientKeyDown}
                onFocus={() => client.trim() && setOpenDD(true)}
                placeholder="Имя клиента"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={openDD}
                aria-controls="client-suggest"
              />
              {/* dropdown */}
              {openDD && (
                <div
                  ref={ddRef}
                  id="client-suggest"
                  className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-xl border bg-white shadow-lg"
                  role="listbox"
                  aria-label="Найденные клиенты"
                >
                  {loadingSugg ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Ищем…</div>
                  ) : suggestions.length ? (
                    <>
                      <div>
                        {suggestions.map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={idx === highlight}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                              idx === highlight ? "bg-gray-100" : ""
                            }`}
                            onMouseEnter={() => setHighlight(idx)}
                            onMouseLeave={() => setHighlight(-1)}
                            onClick={() => pickSuggestion(s)}
                            title={s.company ? s.company : ""}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate">
                                <span className="font-medium">
                                  <Highlight text={s.name} query={client} />
                                </span>
                                {s.company ? (
                                  <span className="ml-2 text-gray-500 truncate">
                                    • {s.company}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {!hasExact && (
                        <>
                          <div className="h-px bg-gray-100 my-1" />
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            onClick={() => {
                              setSelectedClient(null);
                              setOpenDD(false);
                            }}
                          >
                            Создать клиента «{client.trim()}»
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Ничего не найдено. Нажмите Enter, чтобы создать «{client.trim()}».
                    </div>
                  )}
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Вес, кг</div>
              <input
                type="text"
                inputMode="decimal"
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Объём, м³</div>
              <input
                type="text"
                inputMode="decimal"
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Количество мест</div>
              <input
                type="text"
                inputMode="numeric"
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={places}
                onChange={(e) => setPlaces(e.target.value)}
                placeholder="1"
              />
            </label>
          </div>

          {incoterm === "EXW" ? (
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Адрес забора (EXW)</div>
              <input
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={exwAddress}
                onChange={(e) => setExwAddress(e.target.value)}
                placeholder="Город, улица…"
              />
            </label>
          ) : (
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Склад FOB</div>
              <select
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black bg-white"
                value={fobWhId}
                onChange={(e) => setFobWhId(e.target.value)}
              >
                <option value="">Выберите склад…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} • {w.address}
                  </option>
                ))}
              </select>
            </label>
          )}

          {err && <div className="text-sm text-rose-600">{err}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="h-11 px-4 rounded-xl border"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-black text-white disabled:opacity-50"
              disabled={!canSave || saving || loadingSugg}
              aria-busy={saving ? "true" : "false"}
            >
              {saving ? "Создаём…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}