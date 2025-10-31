// src/components/pl/NewPLModal.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function NewPLModal({
  onClose,
  onCreate,          // (payload) => Promise<void>
  clientOptions = [],// массив имён клиентов (строки)
  warehouses = [],   // [{id, name, address}]
}) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [incoterm, setIncoterm] = useState("EXW"); // EXW | FOB
  const [exwAddress, setExwAddress] = useState("");
  const [fobWhId, setFobWhId] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [shipperName, setShipperName] = useState("");
  const [shipperContacts, setShipperContacts] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // datalist id (стабильно между рендерами)
  const dlId = useMemo(() => "clients-" + Math.random().toString(36).slice(2, 8), []);

  useEffect(() => {
    // сброс при открытии
    setTitle("");
    setClient("");
    setIncoterm("EXW");
    setExwAddress("");
    setFobWhId("");
    setWeight("");
    setVolume("");
    setShipperName("");
    setShipperContacts("");
    setSaving(false);
    setErr("");
  }, []);

  const canSave =
    title.trim() &&
    client.trim() &&
    (incoterm === "EXW" ? true : !!fobWhId);

  async function submit(e) {
    e?.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setErr("");

    try {
      await onCreate?.({
        client: client.trim(),
        title: title.trim(),
        weight_kg: weight ? Number(weight) : null,
        volume_cbm: volume ? Number(volume) : null,
        incoterm,
        exw_address: exwAddress.trim(),
        fob_wh_id: fobWhId ? Number(fobWhId) : null,
        shipper_name: shipperName.trim(),
        shipper_contacts: shipperContacts.trim(),
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

            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Клиент</div>
              <input
                list={dlId}
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Имя клиента"
              />
              <datalist id={dlId}>
                {clientOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Вес, кг</div>
              <input
                type="number"
                step="0.001"
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Объём, м³</div>
              <input
                type="number"
                step="0.001"
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Инкотерм</div>
              <select
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black bg-white"
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
              >
                <option value="EXW">EXW</option>
                <option value="FOB">FOB</option>
              </select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Грузоотправитель</div>
              <input
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={shipperName}
                onChange={(e) => setShipperName(e.target.value)}
                placeholder="Компания/контакт"
              />
            </label>
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">Контакты отправителя</div>
              <input
                className="w-full h-11 border rounded-xl px-3 outline-none focus:border-black"
                value={shipperContacts}
                onChange={(e) => setShipperContacts(e.target.value)}
                placeholder="+996..., WeChat…"
              />
            </label>
          </div>

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
              disabled={!canSave || saving}
            >
              {saving ? "Создаём…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}