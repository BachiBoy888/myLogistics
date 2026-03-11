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
      avatar: s.responsible_avatar || null,
      isActive: s.responsible_is_active !== false,
    });

  const serverClientPrice =
    s.clientPrice ??
    s.client_price ??
    s.quote?.clientPrice ??
    s.quote?.client_price;

  const pl_number = s.pl_number ?? s.plNumber ?? s.number ?? "";
  const id = toNumericId(s.id ?? s._id);

  // Leg1 data
  const leg1Amount = Number(s.leg1Amount ?? s.leg1_amount ?? s.calculator?.leg1Amount ?? 0);
  const leg1AmountUsd = Number(s.leg1AmountUsd ?? s.leg1_amount_usd ?? s.calculator?.leg1AmountUSD ?? 0);
  
  // Leg2 manual data (new explicit source of truth)
  const leg2ManualAmount = Number(s.leg2ManualAmount ?? s.leg2_manual_amount ?? 0);
  const leg2ManualAmountUsd = Number(s.leg2ManualAmountUsd ?? s.leg2_manual_amount_usd ?? 0);
  const leg2ManualCurrency = s.leg2ManualCurrency ?? s.leg2_manual_currency ?? "USD";
  
  // Leg2 legacy data (backward compatibility)
  const leg2Amount = Number(s.leg2Amount ?? s.leg2_amount ?? s.calculator?.leg2Amount ?? 0);
  const leg2AmountUsd = Number(s.leg2AmountUsd ?? s.leg2_amount_usd ?? s.calculator?.leg2AmountUSD ?? 0);
  
  // Effective leg2: use manual if set, otherwise legacy
  const effectiveLeg2Usd = leg2ManualAmountUsd > 0 ? leg2ManualAmountUsd : leg2AmountUsd;

  return {
    id,
    pl_number,
    client_id: s.client_id ?? s.clientId ?? null,
    client,
    responsible,

    title: s.title ?? s.name ?? s.cargoTitle ?? "",
    weight_kg: toNum(s.weight_kg ?? s.weightKg ?? s.weight),
    volume_cbm: toNum(s.volume_cbm ?? s.volumeCbm ?? s.volume),
    places: s.places ?? s.places_qty ?? s.placesQty ?? 1,
    pickup_address: s.pickup_address ?? s.pickupAddress ?? s.exwAddress ?? "",
    shipper_name: s.shipper_name ?? s.shipperName ?? "",
    shipper_contacts: s.shipper_contacts ?? s.shipperContacts ?? "",
    incoterm: s.incoterm ?? "EXW",
    fob_warehouse_id: s.fob_warehouse_id ?? s.fobWarehouseId ?? null,
    status: s.status ?? "draft",

    // Leg1 data
    leg1_amount: leg1Amount,
    leg1_amount_usd: leg1AmountUsd,
    leg1_currency: s.leg1Currency ?? s.leg1_currency ?? "USD",
    
    // Leg2 manual data (new source of truth)
    leg2_manual_amount: leg2ManualAmount,
    leg2_manual_amount_usd: leg2ManualAmountUsd,
    leg2_manual_currency: leg2ManualCurrency,
    
    // Leg2 legacy data (backward compatibility)
    leg2_amount: leg2Amount,
    leg2_amount_usd: leg2AmountUsd,
    leg2_currency: s.leg2Currency ?? s.leg2_currency ?? "USD",
    
    // Effective leg2 (unified view)
    effective_leg2_usd: effectiveLeg2Usd,

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
  
  // Normalize pl_details - convert string numeric values to numbers
  const rawPlDetails = s.pl_details ?? s.plDetails ?? {};
  const normalizedPlDetails = {};
  Object.entries(rawPlDetails).forEach(([plId, details]) => {
    normalizedPlDetails[plId] = {
      clientPrice: Number(details.clientPrice ?? details.client_price ?? 0) || 0,
      // Support both new allocatedLeg2Usd and legacy machineCostShare
      allocatedLeg2Usd: Number(details.allocatedLeg2Usd ?? details.allocated_leg2_usd ?? details.machineCostShare ?? details.machine_cost_share ?? 0) || 0,
      allocationMode: details.allocationMode ?? details.allocation_mode ?? 'auto',
    };
  });
  
  return {
    id: s.id ?? s._id ?? null,
    number: s.cons_number ?? s.consNumber ?? s.number ?? "",
    title: s.title ?? s.cons_number ?? s.consNumber ?? "",
    status: s.status ?? "loaded",
    pl_ids: Array.isArray(s.pl_ids)
      ? s.pl_ids
      : Array.isArray(s.plIds)
      ? s.plIds
      : [],
    pl_load_orders: s.pl_load_orders ?? s.plLoadOrders ?? {},
    pl_details: normalizedPlDetails,
    capacity_cbm: Number(s.capacity_cbm ?? s.capacityCbm ?? 0),
    capacity_kg: Number(s.capacity_kg ?? s.capacityKg ?? 0),
    machine_cost: Number(s.machine_cost ?? s.machineCost ?? 0),
    expenses: (s.expenses ?? []).map(e => ({
      id: e.id,
      type: e.type ?? 'other',
      comment: e.comment,
      amount: Number(e.amount) || 0,
      created_at: e.created_at ?? e.createdAt,
    })),
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

export async function deleteClient(id) {
  const res = await mutate(`/clients/${id}`, { method: "DELETE" }, ["/clients"]);
  // 204 No Content - возвращаем null
  return res;
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
   FX (курсы валют)
------------------- */
export async function getFXRates() {
  return req("/fx/latest");
}

export async function convertFX(amount, from, to = "USD") {
  return req(`/fx/convert?amount=${amount}&from=${from}&to=${to}`);
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
   AUTH / FIRST LOGIN
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

// Проверка токена первичной авторизации
export async function verifyFirstLoginToken(token) {
  const res = await fetch(`${BASE}/auth/first-login/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Invalid token" }));
    throw new Error(err.error || err.message || "Invalid token");
  }

  return res.json();
}

// Установка пароля при первичной авторизации
export async function setFirstLoginPassword(token, password) {
  const res = await fetch(`${BASE}/auth/first-login/set-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to set password" }));
    throw new Error(err.error || err.message || "Failed to set password");
  }
  
  return res.json();
}

export async function createUser({ login, name, password, role, phone, email }) {
  return mutate(
    "/users",
    { method: "POST", body: { login, name, password, role, phone, email } },
    ["/users"]
  );
}

export async function updateUser(id, { name, role, phone, email, avatar }) {
  return mutate(
    `/users/${id}`,
    { method: "PATCH", body: { name, role, phone, email, avatar } },
    ["/users"]
  );
}

export async function deactivateUser(id) {
  const res = await fetch(`${BASE}/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to deactivate user" }));
    throw new Error(err.error || err.message || "Failed to deactivate user");
  }

  return res.json();
}
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
export async function setConsolidationPLs(id, targetIds = [], plLoadOrders = {}, plDetails = {}) {
  const target = Array.from(new Set((targetIds || []).map(Number))).filter(Boolean);
  try {
    const res = await mutate(
      `/consolidations/${id}/pl`,
      { method: "PUT", body: { plIds: target, plLoadOrders, plDetails } },
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

// Consolidation Expenses
export async function listConsolidationExpenses(consId) {
  return req(`/consolidations/${consId}/expenses`);
}

export async function createConsolidationExpense(consId, { type, comment, amount }) {
  return mutate(
    `/consolidations/${consId}/expenses`,
    { method: "POST", body: { type, comment, amount } },
    ["/consolidations", `/consolidations/${consId}`]
  );
}

export async function updateConsolidationExpense(consId, expenseId, { title, comment, amount }) {
  return mutate(
    `/consolidations/${consId}/expenses/${expenseId}`,
    { method: "PATCH", body: { title, comment, amount } },
    ["/consolidations", `/consolidations/${consId}`]
  );
}

export async function deleteConsolidationExpense(consId, expenseId) {
  await mutate(
    `/consolidations/${consId}/expenses/${expenseId}`,
    { method: "DELETE" },
    ["/consolidations", `/consolidations/${consId}`]
  );
  return true;
}

// Sync all expenses for consolidation (delete old, create new)
export async function syncConsolidationExpenses(consId, expenses) {
  // Get current expenses
  const current = await listConsolidationExpenses(consId);
  
  // Delete all current expenses
  for (const exp of current) {
    await deleteConsolidationExpense(consId, exp.id);
  }
  
  // Create new expenses
  for (const exp of expenses) {
    await createConsolidationExpense(consId, {
      type: exp.type,
      comment: exp.comment,
      amount: Number(exp.amount) || 0,
    });
  }
  
  return true;
}

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
  deleteClient,

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

  // fx
  getFXRates,
  convertFX,

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

// Поиск клиентов по подстроке (умный поиск с двусторонней транслитерацией)
export async function searchClients(query) {
  if (!query || query.trim() === "") return [];

  const q = query.trim();

  // Простая таблица транслитерации (латиница ↔ кириллица)
  const map = {
    a: "а", b: "б", v: "в", g: "г", d: "д", e: "е", yo: "ё", zh: "ж",
    z: "з", i: "и", j: "й", k: "к", l: "л", m: "м", n: "н", o: "о",
    p: "п", r: "р", s: "с", t: "т", u: "у", f: "ф", h: "х", c: "ц",
    ch: "ч", sh: "ш", shch: "щ", y: "ы", ye: "е", yu: "ю", ya: "я",
  };

  const revMap = Object.fromEntries(
    Object.entries(map).map(([lat, cyr]) => [cyr, lat])
  );

  // Двусторонняя функция транслитерации
  function transliterate(str, direction = "toCyr") {
    let text = str.toLowerCase();
    const dict = direction === "toCyr" ? map : revMap;
    // сортируем по длине, чтобы сначала заменять shch, ch, sh и т.п.
    for (const [k, v] of Object.entries(dict).sort(
      (a, b) => b[0].length - a[0].length
    )) {
      const re = new RegExp(k, "g");
      text = text.replace(re, v);
    }
    return text;
  }

  const toCyr = transliterate(q, "toCyr");
  const toLat = transliterate(q, "toLat");

  try {
    // параллельно ищем по 3 вариантам: исходный, кириллица, латиница
    const [r1, r2, r3] = await Promise.all([
      req(`/clients/search?q=${encodeURIComponent(q)}`),
      toCyr !== q ? req(`/clients/search?q=${encodeURIComponent(toCyr)}`) : Promise.resolve([]),
      toLat !== q ? req(`/clients/search?q=${encodeURIComponent(toLat)}`) : Promise.resolve([]),
    ]);

    // склеиваем и удаляем дубли по id
    const merged = [
      ...(Array.isArray(r1) ? r1 : []),
      ...(Array.isArray(r2) ? r2 : []),
      ...(Array.isArray(r3) ? r3 : []),
    ];
    const seen = new Set();
    return merged.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  } catch (err) {
    console.error("Ошибка поиска клиентов:", err);
    return [];
  }
}

// Резолв: если клиент уже есть, вернуть его, иначе создать нового
export async function resolveOrCreateClient(name) {
  if (!name || name.trim() === "") return null;

  // 1. Поиск похожих клиентов
  const results = await searchClients(name);
  const normalized = name.trim().toLowerCase();

  // 2. Проверка на точное совпадение (без учёта регистра)
  const exact = results.find(
    (c) => (c.name || "").trim().toLowerCase() === normalized
  );
  if (exact) {
    return exact;
  }

  // 3. Если не нашли — создаём нового
  try {
    const created = await createClient({ name });
    return created;
  } catch (err) {
    console.error("Ошибка создания клиента:", err);
    return null;
  }
}

/* -------------------
   USERS / PROFILE
------------------- */
export async function getCurrentUser() {
  return req("/users/me");
}

export async function updateCurrentUser(patch) {
  return mutate("/users/me", { method: "PATCH", body: patch }, ["/users/me", "/auth/me"]);
}

export async function changePassword(oldPassword, newPassword) {
  const res = await fetch(`${BASE}/users/me/password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to change password" }));
    throw new Error(err.error || err.message || "Failed to change password");
  }
  
  return res.json();
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${BASE}/users/me/avatar`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || err.message || "Failed to upload avatar");
  }
  
  return res.json();
}