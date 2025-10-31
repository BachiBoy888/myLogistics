import { safeEvents } from "../utils/events.js";

// === БАЗА API ===
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const BASE = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

// === ДЕДУПЛИКАЦИЯ И МИКРОКЭШ ДЛЯ GET ===
const inflight = new Map(); // key -> Promise
const microcache = new Map(); // key -> { ts, data }
const TTL_MS = 2000;

function cacheKey(method, path) {
  if (method !== "GET") return null;
  return `GET ${path}`;
}

function invalidateCacheByPrefix(prefixes = []) {
  if (!prefixes.length) return;
  for (const key of microcache.keys()) {
    for (const pref of prefixes) {
      if (key.startsWith(`GET ${pref}`)) {
        microcache.delete(key);
        inflight.delete(key);
        break;
      }
    }
  }
}

/* -------------------
   ВСПОМОГАТЕЛЬНЫЕ
------------------- */
function isFormData(v) {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

async function req(path, { method = "GET", body, headers } = {}) {
  const isFD = isFormData(body);
  const hasBody = body !== undefined && body !== null;

  // дедуп + микрокэш только для GET
  const key = cacheKey(method, path);
  if (key) {
    const cached = microcache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return cached.data;
    }
    const inProg = inflight.get(key);
    if (inProg) return inProg;
  }

  const p = (async () => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(hasBody && !isFD ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      body: hasBody ? (isFD ? body : JSON.stringify(body)) : undefined,
      credentials: "include",
    });

    // 204 → вернём null (обработаем выше)
    if (res.status === 204) return null;

    if (!res.ok) {
      let msg = `${method} ${path} failed: ${res.status}`;
      try {
        const text = await res.text();
        if (text) msg += ` ${text}`;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  })();

  if (key) inflight.set(key, p);

  try {
    const data = await p;
    if (key) {
      inflight.delete(key);
      microcache.set(key, { ts: Date.now(), data });
    }
    return data;
  } catch (e) {
    if (key) inflight.delete(key);
    throw e;
  }
}

async function mutate(path, init, invalidatePrefixes = []) {
  const res = await req(path, init);
  // Инвалидация микрокэша после мутаций
  invalidateCacheByPrefix(invalidatePrefixes);
  return res;
}

// безопасно приводим к числу
const toNum = (v) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? null
    : Number(v);

// пробуем получить числовой id (или null)
const toNumericId = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
};

/* -------------------
   НОРМАЛИЗАТОРЫ
------------------- */

// PL (сервер → UI)
export function normalizePL(s) {
  if (!s) return null;

  const client =
    s.client && typeof s.client === "object"
      ? s.client
      : typeof s.client === "string"
      ? { name: s.client }
      : typeof s.client_name === "string"
      ? { name: s.client_name }
      : { name: "—" };

  const responsible =
    s.responsible ||
    (s.responsible_user_id && {
      id: s.responsible_user_id,
      name: s.responsible_name || "Логист",
    });

  const serverClientPrice =
    s.clientPrice ??
    s.client_price ??
    s.quote?.clientPrice ??
    s.quote?.client_price;

  const pl_number = s.pl_number ?? s.plNumber ?? s.number ?? "";
  const id = toNumericId(s.id ?? s._id);

  return {
    id,
    pl_number,
    client_id: s.client_id ?? s.clientId ?? null,
    client,
    responsible,

    title: s.title ?? s.name ?? s.cargoTitle ?? "",
    weight_kg: toNum(s.weight_kg ?? s.weightKg ?? s.weight),
    volume_cbm: toNum(s.volume_cbm ?? s.volumeCbm ?? s.volume),
    places_qty: s.places_qty ?? s.placesQty ?? 0,
    pickup_address: s.pickup_address ?? s.pickupAddress ?? s.exwAddress ?? "",
    shipper_name: s.shipper_name ?? s.shipperName ?? "",
    shipper_contacts: s.shipper_contacts ?? s.shipperContacts ?? "",
    incoterm: s.incoterm ?? "EXW",
    fob_warehouse_id: s.fob_warehouse_id ?? s.fobWarehouseId ?? null,
    status: s.status ?? "draft",

    // калькулятор (если сервер начал отдавать jsonb)
    calculator:
      typeof s.calculator === "object" && s.calculator
        ? s.calculator
        : undefined,

    docs: Array.isArray(s.docs) ? s.docs : [],
    comments: Array.isArray(s.comments) ? s.comments : [],

    quote: {
      calc_cost: toNum(
        s.quote?.calc_cost ?? s.quote?.calcCost ?? s.calc_cost ?? s.calcCost
      ),
      client_price: toNum(serverClientPrice),
    },

    created_at: s.created_at ?? s.createdAt ?? new Date().toISOString(),
    updated_at: s.updated_at ?? s.updatedAt ?? new Date().toISOString(),
  };
}

// CONSOLIDATION (сервер → UI)
export function normalizeCons(s) {
  if (!s) return null;
  return {
    id: s.id ?? s._id ?? null,
    number: s.cons_number ?? s.consNumber ?? s.number ?? "",
    title: s.title ?? s.cons_number ?? s.consNumber ?? "",
    status: s.status ?? "loaded", // синхронизировано с enum consolidation_status_v2
    pl_ids: Array.isArray(s.pl_ids)
      ? s.pl_ids
      : Array.isArray(s.plIds)
      ? s.plIds
      : [],
    capacity_cbm: s.capacity_cbm ?? s.capacityCbm ?? 0,
    capacity_kg: s.capacity_kg ?? s.capacityKg ?? 0,
    created_at: s.created_at ?? s.createdAt ?? new Date().toISOString(),
    updated_at: s.updated_at ?? s.updatedAt ?? new Date().toISOString(),
  };
}

/* -------------------
   CLIENTS
------------------- */
export async function getClients() {
  const json = await req("/clients");
  return Array.isArray(json) ? json : json.items ?? json.data ?? [];
}
export async function createClient(data) {
  const res = await mutate("/clients", { method: "POST", body: data }, ["/clients"]);
  return res;
}
export async function updateClient(id, data) {
  return mutate(`/clients/${id}`, { method: "PATCH", body: data }, ["/clients"]);
}

/* -------------------
   PL
------------------- */
export async function listPLs() {
  const json = await req("/pl");
  const arr = Array.isArray(json) ? json : json.items ?? json.data ?? [];
  return arr
    .map(normalizePL)
    .filter(Boolean)
    .map((p) => ({
      ...p,
      quote: p?.quote ?? { calc_cost: null, client_price: null },
    }));
}
export const getPL = listPLs;

// ← GET один PL по id
export async function getPLById(id) {
  const nId = toNumericId(id);
  if (nId === null) throw new Error("Некорректный идентификатор PL");
  const json = await req(`/pl/${nId}`);
  return normalizePL(json);
}

export async function createPL(data) {
  if (!data.client_id) throw new Error("client_id обязателен при создании PL");
  const json = await mutate(
    "/pl",
    { method: "POST", body: data },
    ["/pl"] // список и потенциально конкретные
  );
  return normalizePL(json);
}

function buildUpdatePayload(data = {}) {
  const payload = { ...data };

  if (payload.client_price != null && payload.clientPrice == null) {
    payload.clientPrice = payload.client_price;
    delete payload.client_price;
  }

  if (payload.quote?.client_price != null && payload.clientPrice == null) {
    payload.clientPrice = payload.quote.client_price;
    const { quote, ...rest } = payload;
    return rest;
  }

  // прозрачная передача calculator (jsonb)
  if (payload.calculator != null && typeof payload.calculator !== "object") {
    // если пришла строка — не отправляем, чтобы не ломать сервер
    delete payload.calculator;
  }

  return payload;
}

export async function updatePL(id, data) {
  const nId = toNumericId(id);
  if (nId === null) throw new Error("Некорректный идентификатор PL");
  const payload = buildUpdatePayload(data);
  const json = await mutate(
    `/pl/${nId}`,
    { method: "PUT", body: payload },
    ["/pl", `/pl/${nId}`]
  );

  // если сервер вернул 204/пусто — добираем свежие данные GET'ом
  if (json === null || json === undefined) {
    try {
      return await getPLById(nId);
    } catch {
      return null;
    }
  }
  return normalizePL(json);
}

export async function assignPLResponsible(id, responsible_user_id) {
  const nId = toNumericId(id);
  if (nId === null) throw new Error("Некорректный идентификатор PL");
  const json = await mutate(
    `/pl/${nId}`,
    { method: "PUT", body: { responsible_user_id } },
    ["/pl", `/pl/${nId}`]
  );
  if (json === null || json === undefined) {
    try {
      return await getPLById(nId);
    } catch {
      return null;
    }
  }
  return normalizePL(json);
}

export async function updateClientPrice(id, clientPrice) {
  return updatePL(id, { clientPrice });
}
export async function deletePL(id) {
  const nId = toNumericId(id);
  if (nId === null) throw new Error("Некорректный id для удаления PL");
  await mutate(`/pl/${nId}`, { method: "DELETE" }, ["/pl", `/pl/${nId}`]);
  return true;
}

/* -------------------
   PL DOCUMENTS
------------------- */
export async function listPLDocs(plId) {
  return req(`/pl/${plId}/docs`);
}
export async function uploadPLDoc(plId, { file, doc_type, name }) {
  const form = new FormData();
  if (file && file.name) form.append("file", file, file.name);
  else form.append("file", file);
  form.append("doc_type", doc_type);
  if (name) form.append("name", name);
  const res = await mutate(
    `/pl/${plId}/docs`,
    { method: "POST", body: form },
    ["/pl", `/pl/${plId}`, `/pl/${plId}/docs`, `/pl/${plId}/events`]
  );
  return res;
}
export async function updatePLDoc(plId, docId, patch) {
  return mutate(
    `/pl/${plId}/docs/${docId}`,
    { method: "PATCH", body: patch },
    ["/pl", `/pl/${plId}`, `/pl/${plId}/docs`, `/pl/${plId}/events`]
  );
}
export async function deletePLDoc(plId, docId) {
  await mutate(
    `/pl/${plId}/docs/${docId}`,
    { method: "DELETE" },
    ["/pl", `/pl/${plId}`, `/pl/${plId}/docs`, `/pl/${plId}/events`]
  );
  return true;
}
export async function getPLDocHistory(plId, docId) {
  return req(`/pl/${plId}/docs/${docId}/history`);
}

/* -------------------
   PL EVENTS (timeline)
------------------- */
function normalizeEvent(plId, e, idx = 0) {
  const at =
    e?.at ??
    e?.createdAt ??
    e?.created_at ??
    e?.timestamp ??
    new Date().toISOString();

  const type = e?.type ?? "event";
  const meta = e?.meta ?? {};
  const id = e?.id ?? e?._id ?? `${type}-${plId}-${idx}`;

  return {
    id,
    type,
    title: e?.title ?? "",
    details: e?.details ?? e?.message ?? "",
    user: e?.user ?? e?.author ?? null,
    createdAt: at,
    meta,
  };
}

export async function listPLEvents(plId) {
  const json = await req(`/pl/${plId}/events`);
  const arr = Array.isArray(json) ? json : json?.items ?? json?.data ?? [];
  const sanitized = safeEvents(arr, {
    plId,
    logger: (stats) => {
      if (stats.dropped > 0) {
        console.warn("[listPLEvents] dropped invalid items", stats);
      }
    },
  });
  return sanitized.map((e, i) => normalizeEvent(plId, e, i));
}

/* -------------------
   PL COMMENTS
------------------- */
export async function listPLComments(plId) {
  const arr = await req(`/pl/${Number(plId)}/comments`);
  return Array.isArray(arr) ? arr : [];
}
export async function addPLComment(plId, { text }) {
  return mutate(
    `/pl/${Number(plId)}/comments`,
    { method: "POST", body: { text } },
    ["/pl", `/pl/${plId}/comments`, `/pl/${plId}/events`]
  );
}
export async function deletePLComment(plId, commentId) {
  await mutate(
    `/pl/${Number(plId)}/comments/${commentId}`,
    { method: "DELETE" },
    ["/pl", `/pl/${plId}/comments`, `/pl/${plId}/events`]
  );
  return true;
}

/* -------------------
   AUTH
------------------- */
export async function login({ login, password }) {
  // после логина инвалидация — чтобы /auth/me и прочее не тянулись из кэша
  const res = await mutate(`/auth/login`, { method: "POST", body: { login, password } }, ["/auth/me"]);
  return res;
}
export async function logout() {
  const res = await mutate(`/auth/logout`, { method: "POST" }, ["/auth/me", "/pl", "/clients", "/consolidations"]);
  return res;
}
export async function me() {
  return req(`/auth/me`);
}

/* -------------------
   CONSOLIDATIONS
------------------- */
export async function listConsolidations(params = {}) {
  const q = new URLSearchParams(params).toString();
  const base = await req(`/consolidations${q ? `?${q}` : ""}`);
  const arr = Array.isArray(base) ? base : base.items ?? base.data ?? [];

  const detailed = await Promise.all(
    arr.map(async (row) => {
      const id = row.id ?? row._id;
      if (!id) return row;
      try {
        const full = await req(`/consolidations/${id}`);
        return { ...row, plIds: full.plIds ?? full.pl_ids ?? [] };
      } catch {
        return row;
      }
    })
  );
  return detailed.map(normalizeCons);
}
export async function getConsolidation(id) {
  const json = await req(`/consolidations/${id}`);
  return normalizeCons(json);
}
export async function createConsolidation({ title, plIds = [] } = {}) {
  const cons = await mutate(
    "/consolidations",
    { method: "POST", body: { title, plIds } },
    ["/consolidations"]
  );
  if (plIds.length) {
    try {
      await setConsolidationPLs(cons.id, plIds);
    } catch {}
  }
  return normalizeCons(cons);
}
export async function updateConsolidation(id, patch = {}) {
  const json = await mutate(
    `/consolidations/${id}`,
    { method: "PATCH", body: patch },
    ["/consolidations", `/consolidations/${id}`]
  );
  return normalizeCons(json);
}
export async function deleteConsolidation(id) {
  await mutate(`/consolidations/${id}`, { method: "DELETE" }, ["/consolidations", `/consolidations/${id}`]);
  return true;
}
export async function addPLToConsolidation(id, plId) {
  return mutate(
    `/consolidations/${id}/pl`,
    { method: "POST", body: { plId } },
    ["/consolidations", `/consolidations/${id}`]
  );
}
export async function removePLFromConsolidation(id, plId) {
  await mutate(
    `/consolidations/${id}/pl/${plId}`,
    { method: "DELETE" },
    ["/consolidations", `/consolidations/${id}`]
  );
  return true;
}
export async function getConsolidationStatusHistory(id) {
  const json = await req(`/consolidations/${id}/status-history`);
  return Array.isArray(json) ? json : json.items ?? json.data ?? [];
}
export async function setConsolidationPLs(id, targetIds = []) {
  const target = Array.from(new Set((targetIds || []).map(Number))).filter(Boolean);
  try {
    const res = await mutate(
      `/consolidations/${id}/pl`,
      { method: "PUT", body: { plIds: target } },
      ["/consolidations", `/consolidations/${id}`]
    );
    return normalizeCons(res?.consolidation ?? res) || getConsolidation(id);
  } catch {
    const current = await getConsolidation(id);
    const currentIds = Array.isArray(current?.pl_ids) ? current.pl_ids.map(Number) : [];
    const toAdd = target.filter((x) => !currentIds.includes(x));
    const toRemove = currentIds.filter((x) => !target.includes(x));
    for (const pid of toAdd) await addPLToConsolidation(id, pid);
    for (const pid of toRemove) await removePLFromConsolidation(id, pid);
    return getConsolidation(id);
  }
}

/* -------------------
   USERS
------------------- */
export async function listUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  return req(`/users${query ? `?${query}` : ""}`, { method: "GET" });
}

/* -------------------
   DEFAULT EXPORT
------------------- */
const api = {
  // clients
  getClients,
  createClient,
  updateClient,

  // pl
  listPLs,
  getPL,
  getPLById,
  createPL,
  updatePL,
  deletePL,
  updateClientPrice,
  assignPLResponsible,

  // pl docs
  listPLDocs,
  uploadPLDoc,
  updatePLDoc,
  deletePLDoc,
  getPLDocHistory,

  // pl events
  listPLEvents,

  // pl comments
  listPLComments,
  addPLComment,
  deletePLComment,

  // auth
  login,
  logout,
  me,
  listUsers,

  // consolidations
  listConsolidations,
  getConsolidation,
  createConsolidation,
  updateConsolidation,
  deleteConsolidation,
  setConsolidationPLs,
  addPLToConsolidation,
  removePLFromConsolidation,
  getConsolidationStatusHistory,
};

export default api;