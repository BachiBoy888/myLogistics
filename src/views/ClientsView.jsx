// src/views/ClientsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { Users, ChevronRight } from "lucide-react";
import { humanStatus } from "../constants/statuses.js";
import { updateClient } from "../api/client.js";

export default function ClientsView({
  pls,
  clients = [],
  onOpenPL,
  onAddClient,
  openClientId = null,
  onConsumeOpenClient,
}) {
  const clientNameOf = (pl) =>
    typeof pl?.client === "string" ? pl.client : pl?.client?.name || pl?.client_name || "—";

  const clientList = useMemo(() => {
    const map = new Map();
    for (const c of clients || []) {
      const name = (c?.name || "").trim();
      if (!name) continue;
      map.set(name, {
        id: c?.id ?? null,
        name,
        company: c?.company ?? "",
        phone: c?.phone ?? "",
        phone2: c?.phone2 ?? "",
        email: c?.email ?? "",
        notes: c?.notes ?? "",
        pls: [],
      });
    }
    for (const pl of pls || []) {
      const name = (clientNameOf(pl) || "—").trim() || "—";
      const cid = pl?.client_id ?? pl?.clientId ?? pl?.client?.id ?? null;
      if (!map.has(name)) {
        map.set(name, { id: cid ?? null, name, pls: [] });
      } else {
        const row = map.get(name);
        if (row.id == null && cid != null) row.id = cid;
      }
      map.get(name).pls.push(pl);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [clients, pls]);

  const [selClientName, setSelClientName] = useState(clientList[0]?.name ?? null);
  const selClient = clientList.find((c) => c.name === selClientName) || null;

  const [form, setForm] = useState(null);
  useEffect(() => {
    if (!selClient) return setForm(null);
    setForm({
      company: selClient.company ?? "",
      name: selClient.name ?? "",
      phone: selClient.phone ?? "",
      phone2: selClient.phone2 ?? "",
      email: selClient.email ?? "",
      notes: selClient.notes ?? "",
    });
  }, [selClientName, selClient?.id]);

  async function saveField(field, value) {
    if (!selClient?.id) return;
    try {
      await updateClient(selClient.id, { [field]: value });
    } catch (err) {
      console.error("Ошибка при обновлении клиента:", err);
      alert("Не удалось сохранить изменения клиента");
    }
  }

  const sumClient = (selClient?.pls || []).reduce(
    (acc, pl) => acc + (pl.quote?.client_price || 0),
    0
  );
  const activePL = (selClient?.pls || []).filter((pl) => pl.status !== "closed");
  const closedPL = (selClient?.pls || []).filter((pl) => pl.status === "closed");
  const isEditable = !!selClient?.id;

  return (
    <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Левая колонка: список клиентов */}
      <section className="bg-white rounded-2xl shadow-sm border">
        <div className="p-4 flex items-center justify-between">
          <div className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Список клиентов
          </div>
          <div className="text-xs text-gray-500">Всего: {clientList.length}</div>
        </div>

        <div className="px-4 pb-2">
          <button
            onClick={() => {
              const name = prompt("Введите название клиента:");
              if (!name?.trim()) return;
              onAddClient?.({ name: name.trim() });
            }}
            className="w-full bg-black text-white rounded-lg px-3 py-2 text-sm mt-2"
          >
            + Добавить клиента
          </button>
        </div>

        <div className="divide-y">
          {clientList.map((c) => (
            <button
              key={`${c.name}#${c.id ?? "noid"}`}
              onClick={() => setSelClientName(c.name)}
              className={`w-full text-left p-4 hover:bg-gray-50 ${
                selClientName === c.name ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-gray-600">
                    PL: {c.pls.length}
                    {c.id ? ` • ID: ${c.id}` : ""}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
          {clientList.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">Клиентов пока нет</div>
          )}
        </div>
      </section>

      {/* Правая колонка: карточка клиента */}
      <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {selClient ? (
          <div>
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">{selClient.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                PL всего: {selClient.pls.length} • На сумму: ${sumClient}
              </div>
            </div>

            <div className="p-4 space-y-4">
              <Card title="Карточка клиента">
                {!isEditable && (
                  <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    Этот клиент пока не существует в справочнике (нет ID). Создай его в списке
                    слева, чтобы редактировать и сохранять поля.
                  </div>
                )}

                <Field
                  label="Название компании"
                  value={form?.company ?? ""}
                  disabled={!isEditable}
                  onChange={(v) => setForm((f) => ({ ...f, company: v }))}
                  onBlur={() => saveField("company", form?.company ?? "")}
                />
                <Field
                  label="Имя клиента"
                  value={form?.name ?? ""}
                  disabled={!isEditable}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  onBlur={() => saveField("name", form?.name ?? "")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Номер телефона 1"
                    value={form?.phone ?? ""}
                    disabled={!isEditable}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    onBlur={() => saveField("phone", form?.phone ?? "")}
                  />
                  <Field
                    label="Номер телефона 2"
                    value={form?.phone2 ?? ""}
                    disabled={!isEditable}
                    onChange={(v) => setForm((f) => ({ ...f, phone2: v }))}
                    onBlur={() => saveField("phone2", form?.phone2 ?? "")}
                  />
                </div>
                <Field
                  label="Email"
                  value={form?.email ?? ""}
                  disabled={!isEditable}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  onBlur={() => saveField("email", form?.email ?? "")}
                />
                <Field
                  label="Особые комментарии по клиенту"
                  textarea
                  value={form?.notes ?? ""}
                  disabled={!isEditable}
                  onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                  onBlur={() => saveField("notes", form?.notes ?? "")}
                />
              </Card>

              <Card title="Активные PL">
                <div className="divide-y">
                  {activePL.map((pl) => (
                    <button
                      key={pl.id}
                      className="w-full text-left py-2 hover:bg-gray-50 px-2 rounded-md"
                      onClick={() => onOpenPL?.(pl.id)}
                      title="Открыть карточку PL"
                    >
                      <div className="font-medium truncate">
                        {pl.pl_number} — {pl.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {humanStatus(pl.status)} • ${pl.quote?.client_price || 0}
                      </div>
                    </button>
                  ))}
                  {activePL.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">Нет активных PL</div>
                  )}
                </div>
              </Card>

              <Card title="Закрытые PL">
                <div className="divide-y">
                  {closedPL.map((pl) => (
                    <button
                      key={pl.id}
                      className="w-full text-left py-2 hover:bg-gray-50 px-2 rounded-md"
                      onClick={() => onOpenPL?.(pl.id)}
                      title="Открыть карточку PL"
                    >
                      <div className="font-medium truncate">
                        {pl.pl_number} — {pl.title}
                      </div>
                      <div className="text-xs text-gray-600">Закрыт</div>
                    </button>
                  ))}
                  {closedPL.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">Закрытых PL нет</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">Выберите клиента из списка</div>
        )}
      </section>
    </main>
  );
}

/* === Поле редактирования === */
function Field({ label, value, onChange, onBlur, textarea = false, disabled = false }) {
  return (
    <label className="block text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      {textarea ? (
        <textarea
          className="w-full border rounded-lg px-3 py-2 min-h-[84px] disabled:bg-gray-100"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
        />
      ) : (
        <input
          className="w-full border rounded-lg px-3 py-2 h-[40px] disabled:bg-gray-100"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
        />
      )}
    </label>
  );
}