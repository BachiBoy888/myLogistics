# 🔍 MyLogistics Backend/System Audit Report

**Дата составления:** 2026-03-22  
**Версия кода:** myLogistics/server (миграции 0000-0032)  
**Аудитор:** Backend System Audit Agent  

---

## 1. Executive Summary

**Проект:** MyLogistics — система управления логистикой грузоперевозок (Китай → Кыргызстан)  
**Стек технологий:** Fastify + PostgreSQL + Drizzle ORM + React/Vite frontend  
**Состояние проекта:** Production-ready с активной разработкой  

### Ключевые находки

| Категория | Находка | Статус |
|-----------|---------|--------|
| Архитектура | Чёткое разделение на routes/services | ✅ Хорошо |
| Транзакции | Используются в критичных flow (lead conversion) | ✅ Хорошо |
| Data Integrity | Двойные источники истины для leg2 цен | ⚠️ Риск |
| Legacy код | Deprecated пути (legacy conversion mode) | ⚠️ Требует внимания |
| Критический риск | Синхронизация PL статусов с консолидацией | 🔴 Высокий |

---

## 2. Project Structure Map

```
myLogistics/
├── server/                      # Backend (Fastify)
│   ├── server.js               # Точка входа, bootstrap, middleware
│   ├── bootstrap/
│   │   └── env.js              # Загрузка .env с preservation
│   ├── db/
│   │   └── schema.js           # Drizzle ORM schema
│   ├── drizzle/                # SQL миграции (0000-0032)
│   │   ├── 0000_loud_peter_parker.sql
│   │   ├── 0001_pink_moira_mactaggert.sql
│   │   ├── ...
│   │   ├── 0032_add_consolidation_planned_arrival_date.sql
│   │   └── meta/
│   │       └── _journal.json   # Журнал миграций
│   ├── routes/                 # API endpoints
│   │   ├── auth.js             # Login/logout/JWT
│   │   ├── users.js            # CRUD пользователей
│   │   ├── clients.js          # Клиенты + fuzzy поиск
│   │   ├── pl.js               # PL (Packing List) + документы + события
│   │   ├── leads.js            # Лиды + конвертация в PL
│   │   ├── consolidations.js   # Консолидации + расходы
│   │   ├── analytics.js        # Аналитика (daily snapshots)
│   │   ├── fx.js               # Курсы валют NBKR
│   │   ├── import.js           # Импорт Excel
│   │   └── health.js           # Health checks
│   ├── services/               # Бизнес-логика
│   │   ├── consolidations.js   # Генерация номеров CONS
│   │   ├── cons-validators.js  # Валидация статусов консолидаций
│   │   └── storage.js          # Файловое хранилище
│   ├── lib/
│   │   ├── phone.js            # Нормализация телефонов KG
│   │   └── phone.test.js       # Unit тесты телефонов
│   └── scripts/                # Утилиты
│       ├── migrate-prod-safe.js   # Безопасные миграции на прод
│       ├── seed-user.js           # Создание пользователей
│       ├── reset-password.js      # Сброс пароля
│       └── build-analytics-snapshots.js  # Ежедневная аналитика
├── src/                        # Frontend (React + Vite)
│   └── ...
└── docs/                       # Документация
    └── ...
```

---

## 3. Backend Architecture

### 3.1 Точка входа и Bootstrap (`server.js`)

#### Структура bootstrap

```javascript
// Последовательность загрузки:
1. bootstrap/env.js          // Загрузка .env с preservation
2. Fastify instance creation // Logger, AJV config, trustProxy
3. Database connection       // postgres + drizzle
4. Production migrations     // Автоматический drizzle migrate
5. Runtime schema fix        // ALTER TABLE ADD COLUMN IF NOT EXISTS
6. Plugin registration       // sensible, cors, helmet, multipart, cookie, rateLimit
7. JWT helpers & authGuard   // Cookie-based auth
8. Static files              // uploads/, dist/
9. Route registration        // API endpoints
10. SPA fallback            // index.html для не-API
11. Error handler           // Global error handling
12. Graceful shutdown       // SIGINT/SIGTERM handlers
```

#### Плюсы реализации

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| Graceful shutdown | process.on(SIGINT/SIGTERM) с закрытием соединений | ✅ Отлично |
| Runtime schema fix | ALTER TABLE ADD COLUMN IF NOT EXISTS для avatar | ✅ Хорошо |
| Автоматические миграции | Выполняются в production/preview | ✅ Удобно |
| CORS | Environment-based allowlist с fallback | ✅ Гибко |
| Rate limiting | Per-endpoint конфигурация | ✅ Правильно |
| Security | helmet, httpOnly cookies, JWT | ✅ Стандарт |

#### Проблемы и риски

| Проблема | Локация | Риск | Рекомендация |
|----------|---------|------|--------------|
| Дублирование bcrypt | package.json | Низкий | Удалить bcrypt, оставить bcryptjs |
| JWT_SECRET fallback | server.js:JWT_SECRET | 🔴 Средний | Убрать fallback в production |
| trustProxy: true | server.js:Fastify config | 🟡 Средний | Ограничить доверенные прокси |
| Раздутый error handler | setErrorHandler | 🟡 Низкий | Убрать stack trace в production |

#### Code review: JWT configuration

```javascript
// server.js (строки ~185-190)
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";  // ⚠️ Fallback опасен
const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";
```

**Проблема:** Если `JWT_SECRET` не задан в production, используется предсказуемый секрет.

**Рекомендация:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && IS_PROD) {
  console.error("JWT_SECRET is required in production");
  process.exit(1);
}
```

### 3.2 Структура роутов и middleware

#### Регистрация роутов (server.js)

```javascript
// API Routes с префиксами
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(healthRoutes, { prefix: "/api" });
await app.register(analyticsRoutes, { prefix: "/api/analytics" });
await app.register(fxRoutes, { prefix: "/api/fx" });
await app.register(importRoutes, { prefix: "/api/import" });
await app.register(clientsRoutes, { prefix: "/api" });
await app.register(plRoutes, { prefix: "/api/pl" });
await app.register(consolidationsRoutes, { prefix: "/api/consolidations" });
await app.register(usersRoutes, { prefix: "/api/users" });
await app.register(leadsRoutes, { prefix: "/api" });
```

#### Auth Guard реализация

```javascript
// server.js (строки ~195-198)
app.decorate("authGuard", async (req, reply) => {
  if (!req.user) return reply.unauthorized("Unauthorized");
});
```

**Использование:**
```javascript
// Применяется как preHandler
app.get("/endpoint", { preHandler: app.authGuard }, handler);
// или
app.addHook("preHandler", app.authGuard);
```

#### Проблемы авторизации

| Endpoint | Требуемый auth | Фактический | Статус |
|----------|----------------|-------------|--------|
| GET /api/analytics | ✅ Должен быть | ❌ Нет guard | 🔴 Проблема |
| GET /api/consolidations/:id/expenses | ✅ Должен быть | ⚠️ Нет явного guard | 🟡 Проверить |
| POST /api/public/calculate | Публичный | ✅ Публичный + rate limit | ✅ ОК |
| POST /api/leads | Публичный | ✅ Публичный + rate limit + honeypot | ✅ ОК |

### 3.3 Работа с БД (Drizzle ORM)

#### Конфигурация подключения

```javascript
// server.js (строки ~55-65)
const isLocalDb = DATABASE_URL?.includes("localhost") ||
                  DATABASE_URL?.includes("127.0.0.1");

const sql = postgres(DATABASE_URL, {
  prepare: true,           // Prepared statements
  idle_timeout: 20,        // 20 секунд
  ...(isLocalDb ? {} : { ssl: "require" }),
});

const db = drizzle(sql);
app.decorate("drizzle", db);
```

#### Стиль работы с БД

| Подход | Использование | Место | Оценка |
|--------|---------------|-------|--------|
| Drizzle ORM (query builder) | Основной | Везде | ✅ Рекомендуется |
| Drizzle ORM (transactions) | Критичные операции | leads.js, consolidations.js | ✅ Правильно |
| Raw SQL (db.execute) | Сложные аналитические запросы | analytics.js, clients.js | ⚠️ Приемлемо |
| Raw SQL (sql``) | Триггеры, миграции | schema.js | ✅ Нормально |

#### Транзакции

**✅ Хорошие примеры:**

```javascript
// leads.js: Конвертация лида в PL (строки ~365-450)
const result = await db.transaction(async (tx) => {
  // 1. Lock lead for update
  const [lead] = await tx
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .for("update")           // 🔒 Row-level locking
    .limit(1);

  // 2. Проверка уже сконвертирован
  if (lead.status === "converted" || lead.convertedPlId != null) {
    return { error: "LEAD_ALREADY_CONVERTED", ... };
  }

  // 3. Создание клиента или использование существующего
  // 4. Создание PL
  // 5. Обновление lead
  
  return { success: true, ... };
});
```

```javascript
// consolidations.js: Обновление статуса (строки ~135-210)
const result = await db.transaction(async (tx) => {
  // 1. Получаем текущий статус
  const [before] = await tx.select().from(consolidations)...;
  
  // 2. Валидация документов
  // 3. Синхронизация PL статусов
  await tx.update(pl)
    .set({ status: body.status })
    .where(inArray(pl.id, plIds));
  
  // 4. Обновление консолидации
  // 5. Запись в историю
});
```

**⚠️ Проблемные места (нет транзакций):**

```javascript
// consolidations.js: PUT /:id/pl (строки ~280-380)
// Несколько последовательных операций без транзакции:
// 1. SELECT текущих связей
// 2. DELETE removed
// 3. INSERT new
// 4. UPDATE load_order
// 5. UPDATE calculator details
// 6. UPDATE PL leg2 fields
```

### 3.4 Error Handling

#### Глобальный обработчик

```javascript
// server.js (строки ~330-365)
app.setErrorHandler((error, request, reply) => {
  // CORS errors → 403
  if (error.message?.includes("CORS:")) {
    return reply.code(403).send({
      error: "cors_rejected",
      message: "Origin not allowed",
    });
  }

  // Логирование с полными деталями
  request.log.error({
    tag: "UNHANDLED_ERROR",
    route: request.url,
    method: request.method,
    params: request.body,      // ⚠️ Может содержать sensitive data
    query: request.query,
    stack: error.stack,        // ⚠️ Раскрывает пути в production
    ...
  });

  reply.code(500).send({
    error: "internal_server_error",
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
});
```

#### Проблемы

| Проблема | Риск | Решение |
|----------|------|---------|
| Логирование request.body | Может содержать пароли | Сделать sanitize sensitive fields |
| Логирование error.stack | Раскрывает file paths | Убрать в production |
| Generic 500 messages | Сложно дебажить | Добавить request ID |

---

## 4. Domain Workflow Deep Dive

### 4.1 Lead → Client → PL Workflow

#### Полная диаграмма flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 1: PUBLIC CALCULATOR                                       │
│  POST /api/public/calculate                                       │
│  Auth: Не требуется                                               │
│  Rate limit: 30 запросов/минута                                   │
│                                                                   │
│  Input: { weight, volume, deliveryType, originCity, ... }        │
│  Output: { estimatedPrice, estimatedDaysMin/Max, currency }      │
│                                                                   │
│  Формула расчёта:                                                 │
│  - air: $8.5/kg или $1200/m³, 5±3 дней                           │
│  - road: $2.5/kg или $350/m³, 12±5 дней                          │
│  - express: $12/kg или $1800/m³, 3±2 дня                         │
│  Минимум: $50                                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 2: LEAD CREATION                                           │
│  POST /api/leads                                                  │
│  Auth: Не требуется                                               │
│  Rate limit: 5 запросов/минута                                    │
│  Защита: Honeypot поле (website)                                  │
│                                                                   │
│  Бизнес-логика:                                                   │
│  1. Проверка honeypot (если website заполнен → bot)              │
│  2. Валидация обязательных полей (name, phone, weight, volume)   │
│  3. Расчёт стоимости (если не предоставлена)                     │
│  4. Определение источника (X-Source header или query param)      │
│  5. Сохранение в leads с status = "new"                          │
│                                                                   │
│  Поля лида:                                                       │
│  - contact: name, phone, company, email, note                    │
│  - cargo: cargoName, weight, volume, originCity, destinationCity │
│  - calculation: estimatedPrice, estimatedDaysMin/Max             │
│  - snapshot: calculatorSnapshot (JSONB)                          │
│  - operational: source, status, managerId, clientId              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 3: LEAD MANAGEMENT (Private)                               │
│  GET /api/leads — список с фильтрацией по status                 │
│  GET /api/leads/:id — детали с joins (manager, client, pl)       │
│  PATCH /api/leads/:id — обновление полей                         │
│  DELETE /api/leads/:id — удаление (нельзя удалить converted)     │
│                                                                   │
│  Статусы лида:                                                    │
│  new → contacted → qualified → converted                         │
│              ↓                                                    │
│            lost                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 4: CONVERSION PREVIEW                                      │
│  GET /api/leads/:id/convert-preview                              │
│  Auth: Required                                                   │
│                                                                   │
│  Логика:                                                          │
│  1. Получение лида по ID                                         │
│  2. Нормализация телефона (phone.js)                             │
│  3. Поиск существующих клиентов:                                 │
│     - exactPhoneMatches: по вариантам телефона                   │
│     - existingLink: по lead.clientId                             │
│  4. Формирование proposedNewClient                               │
│                                                                   │
│  Response:                                                        │
│  {                                                                │
│    lead: { ... },                                                 │
│    existingLink: Client | null,                                   │
│    exactPhoneMatches: Client[],                                   │
│    proposedNewClient: { name, phone, company, email },           │
│    normalizedPhone: "996XXXXXXXXX"                                │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 5: CONVERSION (CRITICAL — TRANSACTION)                     │
│  POST /api/leads/:id/convert-to-pl                               │
│  Auth: Required                                                   │
│  Content-Type: application/json                                   │
│                                                                   │
│  Тело запроса (EXPLICIT MODE — recommended):                     │
│  {                                                                │
│    "clientResolution": {                                          │
│      "mode": "existing",  // или "new"                           │
│      "clientId": 123       // для mode=existing                  │
│      // или "client": { ... } для mode=new                       │
│    }                                                              │
│  }                                                                │
│                                                                   │
│  ⚠️ LEGACY MODE (deprecated):                                    │
│  Если clientResolution отсутствует — используется legacy:        │
│  1. Если lead.clientId → использовать его                        │
│  2. Иначе поиск по нормализованному телефону                     │
│  3. Иначе создание нового клиента                                │
└─────────────────────────────────────────────────────────────────┘
```

#### Детали транзакции конвертации

```javascript
// leads.js (строки ~365-450)
await db.transaction(async (tx) => {
  // ШАГ 1: Блокировка лида (FOR UPDATE)
  const [lead] = await tx
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .for("update")           // 🔒 Предотвращает race condition
    .limit(1);

  // ШАГ 2: Idempotency check
  if (lead.status === "converted" || lead.convertedPlId != null) {
    return { error: "LEAD_ALREADY_CONVERTED", status: 409 };
  }

  // ШАГ 3: Client Resolution
  let clientId;
  if (isExplicitMode) {
    if (clientResolution.mode === "existing") {
      // Проверка существования клиента
      const [existing] = await tx
        .select()
        .from(clients)
        .where(eq(clients.id, clientResolution.clientId))
        .limit(1);
      clientId = existing.id;
    } else if (clientResolution.mode === "new") {
      // Создание нового клиента
      const [newClient] = await tx.insert(clients).values({...}).returning();
      clientId = newClient.id;
    }
  } else {
    // LEGACY MODE (lines 298-320)
    // Авто-разрешение по телефону
  }

  // ШАГ 4: Создание PL
  const plName = lead.cargoName || `Груз от ${lead.name}`;
  const [createdPl] = await tx.insert(pl).values({
    name: plName,
    clientId,
    weight: lead.weight,
    volume: lead.volume,
    status: "draft",
    clientPrice: lead.estimatedPrice,
    calculator: lead.calculatorSnapshot || {},
    pickupAddress: lead.originCity,
  }).returning({ id: pl.id, createdAt: pl.createdAt });

  // ШАГ 5: Генерация PL номера
  const year = new Date(createdPl.createdAt).getFullYear();
  const plNumber = `PL-${year}-${createdPl.id}`;
  await tx.update(pl).set({ plNumber }).where(eq(pl.id, createdPl.id));

  // ШАГ 6: Обновление лида
  await tx.update(leads).set({
    status: "converted",
    clientId,
    convertedPlId: createdPl.id,
    managerId: userId,
  }).where(eq(leads.id, id));
});
```

#### Найденные проблемы в Lead flow

| Проблема | Локация | Серьёзность | Описание |
|----------|---------|-------------|----------|
| Legacy mode | leads.js:298-320 | 🟠 High | Авто-разрешение клиента по телефону без явного выбора пользователя |
| Отсутствие валидации clientResolution.client | leads.js | 🟡 Medium | Нет проверки обязательных полей при mode=new |
| Нет логирования конвертации | - | 🟡 Medium | Нет явного события в pl_events при создании из lead |

### 4.2 PL (Packing List) Workflow

#### Статусы PL

```
draft → awaiting_docs → awaiting_load → to_load → loaded
                                               ↓
    ↑───────────────────────────────────────────┘
          (can move back for correction)

to_load → loaded → to_customs → released → kg_customs → collect_payment → delivered → closed
```

#### Требования документов для статусов

```javascript
// pl.js (строки ~195-220)
const STATUS_DOC_REQUIREMENTS = {
  awaiting_load: ['invoice', 'packing_list'],
  to_load: ['inspection'],
  to_customs: ['pre_declaration'],
  collect_payment: ['bill'],
};
```

#### Структура PL таблицы

```javascript
// schema.js — Таблица pl
{
  id: serial("id").primaryKey(),
  plNumber: text("pl_number"),              // Генерируется: PL-YYYY-{id}
  clientId: integer("client_id").references(clients.id, onDelete: "cascade"),
  
  // Основные данные
  name: text("name").notNull(),             // Название груза
  weight: numeric("weight", 12, 3),         // Вес в кг
  volume: numeric("volume", 12, 3),         // Объём в м³
  places: integer("places").default(1),     // Количество мест
  incoterm: text("incoterm"),               // Условия поставки
  pickupAddress: text("pickup_address"),    // Адрес забора
  shipperName: text("shipper_name"),        // Отправитель
  shipperContacts: text("shipper_contacts"),// Контакты отправителя
  status: text("status").default("draft"),  // Статус
  
  // Цена для клиента
  clientPrice: numeric("client_price", 12, 2).default("0"),
  
  // Калькулятор (JSONB snapshot)
  calculator: jsonb("calculator").default("'{}'::jsonb").notNull(),
  
  // ⬇️ Leg 1 (Китай → Кыргызстан)
  leg1Amount: numeric(15, 2).default("0"),
  leg1Currency: text("leg1_currency").default("USD"),
  leg1AmountUsd: numeric(15, 2).default("0"),
  leg1UsdPerKg: numeric(15, 4).default("0"),
  leg1UsdPerM3: numeric(15, 4).default("0"),
  
  // ⬇️ Leg 2 (внутри Кыргызстана) — LEGACY
  leg2Amount: numeric(15, 2).default("0"),
  leg2Currency: text("leg2_currency").default("USD"),
  leg2AmountUsd: numeric(15, 2).default("0"),
  leg2UsdPerKg: numeric(15, 4).default("0"),
  leg2UsdPerM3: numeric(15, 4).default("0"),
  
  // ⬇️ Leg 2 — MANUAL SOURCE OF TRUTH
  leg2ManualAmount: numeric(15, 2).default("0"),
  leg2ManualCurrency: text("leg2_manual_currency").default("USD"),
  leg2ManualAmountUsd: numeric(15, 2).default("0"),
  
  // FX курсы (сохраняются при расчёте)
  fxSource: text("fx_source"),
  fxDate: text("fx_date"),
  fxUsdKgs: numeric(10, 4),
  fxCnyKgs: numeric(10, 4),
  fxSavedAt: timestamp("fx_saved_at"),
  
  // Ответственный
  responsibleUserId: uuid("responsible_user_id").references(users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
}
```

### 4.3 Consolidation Workflow

#### Pipeline статусов консолидации

```javascript
// services/cons-validators.js
export const CONS_PIPELINE = [
  "to_load",           // 0: На погрузку
  "loaded",            // 1: Погружено (default при создании)
  "to_customs",        // 2: Оформление Китай
  "released",          // 3: В пути
  "kg_customs",        // 4: Растаможка Кыргызстан
  "collect_payment",   // 5: Оплата
  "delivered",         // 6: Доставлено
  "closed",            // 7: Закрыто
];
```

#### Создание консолидации

```javascript
// consolidations.js (строки ~90-120)
app.post("/", { preHandler: app.authGuard }, async (req, reply) => {
  const body = CreateBody.parse(raw);

  // Валидация: все PL должны быть в статусе "to_load"
  if (body.plIds?.length) {
    await ensureAllPLsAreToLoad(db, body.plIds);
  }

  // Генерация номера CONS-YYYY-{sequence}
  const consNumber = await nextConsNumber(db);

  const [created] = await db.insert(consolidations).values({
    consNumber,
    title: body.title ?? consNumber,
    status: "loaded",  // ⚠️ Не "to_load", а "loaded"!
    capacityKg: String(body.capacityKg),
    capacityCbm: String(body.capacityCbm),
    plannedArrivalDate: body.plannedArrivalDate,
  }).returning();

  // Добавление PL
  if (body.plIds?.length) {
    await db.insert(consolidationPl)
      .values(body.plIds.map(plId => ({ consolidationId: created.id, plId })))
      .onConflictDoNothing();
  }
});
```

#### Критически важно: Синхронизация статусов

```javascript
// consolidations.js (строки ~135-210)
// При изменении статуса консолидации — автоматически меняются все PL!

if (body.status && before.status !== body.status) {
  // Получаем все PL в консолидации
  const plLinks = await tx
    .select({ plId: consolidationPl.plId })
    .from(consolidationPl)
    .where(eq(consolidationPl.consolidationId, id));
  
  const plIds = plLinks.map(l => l.plId);
  
  // 🔄 СИНХРОНИЗАЦИЯ: Все PL получают статус консолидации
  if (plIds.length > 0) {
    await tx.update(pl)
      .set({ status: body.status, updatedAt: new Date() })
      .where(inArray(pl.id, plIds));
  }
}
```

**⚠️ РИСК:** Если PL был вручную перемещён в более поздний статус, а консолидация движется назад — PL "откатится" назад.

#### Таблица связи consolidation_pl

```javascript
// schema.js — consolidation_pl
{
  consolidationId: uuid("consolidation_id").references(consolidations.id, onDelete: "cascade"),
  plId: integer("pl_id").references(pl.id, onDelete: "cascade"),
  
  loadOrder: integer("load_order").default(0),  // Порядок погрузки
  
  // Ценовые поля (калькулятор)
  clientPrice: numeric(12, 2).default("0"),
  clientPriceSnapshot: numeric(12, 2).default("0"),  // На момент добавления
  
  machineCostShare: numeric(12, 2).default("0"),     // LEGACY
  allocatedLeg2Usd: numeric(12, 2).default("0"),     // Источник истины для leg2
  allocationMode: text("allocation_mode").default("auto"), // auto/manual
  
  addedAt: timestamp("added_at").defaultNow(),
}
```

### 4.4 Источники истины для цен (CRITICAL ANALYSIS)

#### Leg 1: Китай → Кыргызстан

| Поле | Источник | Редактируется | Статус |
|------|----------|---------------|--------|
| `pl.leg1AmountUsd` | PL card | ✅ Да | ✅ Единственный источник |

#### Leg 2: Внутри Кыргызстана

**🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Двойной источник истины**

```
┌─────────────────────────────────────────────────────────────────┐
│  СЦЕНАРИЙ 1: PL НЕ В КОНСОЛИДАЦИИ                               │
├─────────────────────────────────────────────────────────────────┤
│  Источник: PL.leg2ManualAmountUsd                               │
│  Редактирование: В карточке PL                                   │
│  Использование: Расчёты, отчёты                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Добавляем в консолидацию
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  СЦЕНАРИЙ 2: PL В КОНСОЛИДАЦИИ                                  │
├─────────────────────────────────────────────────────────────────┤
│  Источник: consolidation_pl.allocatedLeg2Usd                    │
│  Редактирование: В калькуляторе консолидации                     │
│  Синхронизация: При сохранении → PL.leg2ManualAmountUsd         │
│                                                                 │
│  ⚠️ Проблемы:                                                   │
│  1. При удалении PL из консолидации — allocatedLeg2Usd теряется │
│  2. При прямом обновлении PL — может расходиться с cons_pl      │
│  3. Нет механизма обнаружения расхождений                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Legacy поля (подлежат удалению)

| Поле | Статус | Миграция |
|------|--------|----------|
| `pl.leg2Amount` | Deprecated | Перенесено в leg2ManualAmount |
| `pl.leg2Currency` | Deprecated | Перенесено в leg2ManualCurrency |
| `pl.leg2AmountUsd` | Deprecated | Перенесено в leg2ManualAmountUsd |
| `consolidation_pl.machineCostShare` | Deprecated | Перенесено в allocatedLeg2Usd |

---

## 5. API Endpoints Analysis

### 5.1 Полный реестр endpoints

#### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Body | Response | Description |
|--------|----------|------|------|----------|-------------|
| POST | `/login` | Публичный | `{ login, password }` | `{ id, login, name, ... }` + cookie | Устанавливает httpOnly cookie |
| POST | `/logout` | Cookie | - | `{ ok: true }` | Очищает cookie |
| POST | `/first-login/verify` | Публичный | `{ token }` | `{ id, login, name }` | Проверка токена |
| POST | `/first-login/set-password` | Публичный | `{ token, password }` | User + cookie | Установка пароля |
| GET | `/me` | Cookie | - | User | Текущий пользователь |

#### Health Routes (`/api`)

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/health` | Публичный | Базовый healthcheck |
| GET | `/ping` | Публичный | Простой ping |
| GET | `/metrics/summary` | Публичный | Placeholder метрик |

#### Analytics Routes (`/api/analytics`)

| Method | Endpoint | Auth | Параметры | Описание |
|--------|----------|------|-----------|----------|
| GET | `/` | ⚠️ Нет guard | `from, to, granularity` | Данные из daily snapshots |

**⚠️ Проблема:** Endpoint доступен без авторизации (может содержать sensitive business data).

#### FX Routes (`/api/fx`)

| Method | Endpoint | Auth | Параметры | Кэширование |
|--------|----------|------|-----------|-------------|
| GET | `/latest` | Публичный | - | 30 минут in-memory |
| GET | `/convert` | Публичный | `amount, from, to` | Использует кэш |

#### Import Routes (`/api/import`)

| Method | Endpoint | Auth | Content-Type | Описание |
|--------|----------|------|--------------|----------|
| POST | `/preview` | ✅ | multipart/form-data | Парсинг Excel, проверка конфликтов |
| POST | `/apply` | ✅ | application/json | Применение импорта |

**Поддерживаемые операции:**
- Клиенты: create, skip, overwrite, create_copy
- PL: create, skip, overwrite, move_client, create_copy

#### Client Routes (`/api`)

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/clients/search?q=` | ✅ | Fuzzy search по normalized_name |
| GET | `/clients` | ✅ | Список с агрегатами (plCount, activePlCount) |
| GET | `/clients/:id` | ✅ | Детали + список PL |
| POST | `/clients` | ✅ | Создание |
| PATCH | `/clients/:id` | ✅ | Частичное обновление |
| DELETE | `/clients/:id` | ✅ | Удаление (только если нет PL) |

#### PL Routes (`/api/pl`)

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/` | ✅ | Список всех PL с клиентами |
| GET | `/:id` | ✅ | Детали PL + _counts (docs, comments, history) |
| POST | `/` | ✅ | Создание PL |
| PUT | `/:id` | ✅ | Обновление + проверка документов |
| DELETE | `/:id` | ✅ | Удаление |
| GET | `/:id/comments` | ✅ | Комментарии |
| POST | `/:id/comments` | ✅ | Добавление комментария |
| DELETE | `/:id/comments/:cid` | ✅ | Удаление комментария |
| GET | `/:id/events` | ✅ | Timeline событий |
| GET | `/:plId/docs` | ✅ | Список документов |
| POST | `/:plId/docs` | ✅ | Upload документа |
| PATCH | `/:plId/docs/:docId` | ✅ | Обновление статуса/имени |
| DELETE | `/:plId/docs/:docId` | ✅ | Удаление документа |
| GET | `/:plId/docs/:docId/preview` | ✅ | Inline просмотр |
| GET | `/:plId/docs/:docId/download` | ✅ | Скачивание |
| GET | `/export/excel` | ✅ | Экспорт в Excel |

#### Consolidation Routes (`/api/consolidations`)

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/` | ✅ | Список с фильтром по status |
| GET | `/:id` | ✅ | Детали + plIds + plDetails + expenses |
| POST | `/` | ✅ | Создание |
| PATCH | `/:id` | ✅ | Обновление + синхронизация PL статусов |
| DELETE | `/:id` | ✅ | Удаление |
| GET | `/:id/status-history` | ✅ | История статусов |
| POST | `/:id/pl` | ✅ | Добавление одного PL |
| PUT | `/:id/pl` | ✅ | Bulk замена PL списка |
| DELETE | `/:id/pl/:plId` | ✅ | Удаление PL из консолидации |
| GET | `/:id/expenses` | ⚠️ | Список расходов |
| POST | `/:id/expenses` | ✅ | Создание расхода |
| PATCH | `/:id/expenses/:expenseId` | ✅ | Обновление расхода |
| DELETE | `/:id/expenses/:expenseId` | ✅ | Удаление расхода |

#### User Routes (`/api/users`)

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/?role=` | ✅ | Список пользователей |
| POST | `/` | ✅ Admin | Создание пользователя |
| GET | `/me` | ✅ | Текущий пользователь |
| PATCH | `/me` | ✅ | Обновление профиля |
| POST | `/me/avatar` | ✅ | Upload аватара (base64) |
| POST | `/me/password` | ✅ | Смена пароля |
| GET | `/:id` | ✅ | Детали пользователя |
| PATCH | `/:id` | ✅ Admin | Обновление пользователя |
| DELETE | `/:id` | ✅ Admin | Деактивация |
| GET | `/:id/avatar` | ✅ | Получение аватара |

#### Lead Routes (`/api`)

| Method | Endpoint | Auth | Rate Limit | Описание |
|--------|----------|------|------------|----------|
| POST | `/public/calculate` | Публичный | 30/min | Расчёт стоимости |
| POST | `/leads` | Публичный | 5/min + honeypot | Создание лида |
| GET | `/leads` | ✅ | - | Список лидов |
| GET | `/leads/:id` | ✅ | - | Детали лида |
| PATCH | `/leads/:id` | ✅ | - | Обновление лида |
| DELETE | `/leads/:id` | ✅ | - | Удаление (нельзя converted) |
| GET | `/leads/:id/convert-preview` | ✅ | - | Preview конвертации |
| POST | `/leads/:id/convert-to-pl` | ✅ | - | Конвертация (transaction) |

### 5.2 Дублирование логики

| Логика | Локация 1 | Локация 2 | Статус |
|--------|-----------|-----------|--------|
| Получение пользователя | `pl.js:hydrateResponsible` | `users.js` | Приемлемое |
| Нормализация телефона | `lib/phone.js` | - | ✅ Централизовано |
| Проверка статусов PL | `cons-validators.js:ensureAllPLsAreToLoad` | `consolidations.js` | ✅ Используется |
| Генерация PL номера | `pl.js` | `import.js` | Дублирование |

---

## 6. Database Schema Review

### 6.1 Полная структура таблиц

#### clients
```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  notes TEXT,
  company TEXT,
  normalized_name TEXT,  -- для fuzzy search: lower(unaccent(name))
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes:
CREATE INDEX idx_clients_normalized_name ON clients USING gin (normalized_name gin_trgm_ops);
```

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar TEXT,  -- base64 data URL (!)
  role TEXT NOT NULL DEFAULT 'user',
  is_active TEXT NOT NULL DEFAULT 'true',  -- 'true'|'false' (совместимость с Drizzle)
  first_login_token TEXT,  -- для onboarding
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes:
CREATE UNIQUE INDEX uq_users_login ON users(login);
CREATE INDEX idx_users_first_login_token ON users(first_login_token);
CREATE INDEX idx_users_is_active ON users(is_active);
```

#### pl
```sql
CREATE TABLE pl (
  id SERIAL PRIMARY KEY,
  pl_number TEXT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Основные данные
  name TEXT NOT NULL,
  weight NUMERIC(12, 3),
  volume NUMERIC(12, 3),
  places INTEGER DEFAULT 1,
  incoterm TEXT,
  pickup_address TEXT,
  shipper_name TEXT,
  shipper_contacts TEXT,
  status TEXT DEFAULT 'draft',
  
  -- Цена клиента
  client_price NUMERIC(12, 2) DEFAULT '0',
  
  -- Калькулятор snapshot
  calculator JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- Leg 1 (Китай → КГ)
  leg1_amount NUMERIC(15, 2) DEFAULT '0',
  leg1_currency TEXT DEFAULT 'USD',
  leg1_amount_usd NUMERIC(15, 2) DEFAULT '0',
  leg1_usd_per_kg NUMERIC(15, 4) DEFAULT '0',
  leg1_usd_per_m3 NUMERIC(15, 4) DEFAULT '0',
  
  -- Leg 2 LEGACY
  leg2_amount NUMERIC(15, 2) DEFAULT '0',
  leg2_currency TEXT DEFAULT 'USD',
  leg2_amount_usd NUMERIC(15, 2) DEFAULT '0',
  leg2_usd_per_kg NUMERIC(15, 4) DEFAULT '0',
  leg2_usd_per_m3 NUMERIC(15, 4) DEFAULT '0',
  
  -- Leg 2 SOURCE OF TRUTH
  leg2_manual_amount NUMERIC(15, 2) DEFAULT '0',
  leg2_manual_currency TEXT DEFAULT 'USD',
  leg2_manual_amount_usd NUMERIC(15, 2) DEFAULT '0',
  
  -- FX курсы
  fx_source TEXT,
  fx_date TEXT,
  fx_usd_kgs NUMERIC(10, 4),
  fx_cny_kgs NUMERIC(10, 4),
  fx_saved_at TIMESTAMPTZ,
  
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes:
CREATE INDEX pl_number_idx ON pl(pl_number);
CREATE UNIQUE INDEX pl_number_unique ON pl(pl_number);
CREATE INDEX idx_pl_responsible ON pl(responsible_user_id);
CREATE INDEX idx_pl_fx_date ON pl(fx_date);
```

#### consolidations
```sql
CREATE TABLE consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cons_number TEXT NOT NULL,  -- CONS-YYYY-N
  title TEXT,
  status consolidation_status_v2 NOT NULL DEFAULT 'loaded',
  driver_name TEXT,
  driver_contacts TEXT,
  planned_arrival_date TEXT,  -- YYYY-MM-DD
  capacity_kg NUMERIC(12, 3) DEFAULT '0',
  capacity_cbm NUMERIC(12, 3) DEFAULT '0',
  machine_cost NUMERIC(12, 2) DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enum:
CREATE TYPE consolidation_status_v2 AS ENUM (
  'to_load', 'loaded', 'to_customs', 'released', 
  'kg_customs', 'collect_payment', 'delivered', 'closed'
);

-- Indexes:
CREATE INDEX idx_consolidations_cons_number ON consolidations(cons_number);
CREATE UNIQUE INDEX uq_consolidations_cons_number ON consolidations(cons_number);
CREATE INDEX idx_consolidations_status ON consolidations(status);
```

#### consolidation_pl (junction table)
```sql
CREATE TABLE consolidation_pl (
  consolidation_id UUID NOT NULL REFERENCES consolidations(id) ON DELETE CASCADE,
  pl_id INTEGER NOT NULL REFERENCES pl(id) ON DELETE CASCADE,
  load_order INTEGER DEFAULT 0,
  
  -- Ценовые поля
  client_price NUMERIC(12, 2) DEFAULT '0',
  client_price_snapshot NUMERIC(12, 2) DEFAULT '0',
  machine_cost_share NUMERIC(12, 2) DEFAULT '0',  -- LEGACY
  allocated_leg2_usd NUMERIC(12, 2) DEFAULT '0',  -- SOURCE OF TRUTH
  allocation_mode TEXT DEFAULT 'auto',
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (consolidation_id, pl_id)
);

-- Indexes:
CREATE INDEX idx_consolidation_pl_pl ON consolidation_pl(pl_id);
CREATE INDEX idx_consolidation_pl_cons ON consolidation_pl(consolidation_id);
CREATE INDEX idx_consolidation_pl_order ON consolidation_pl(consolidation_id, load_order);
```

### 6.2 Миграции (drizzle/)

| Файл | Описание | Дата |
|------|----------|------|
| 0000-0015 | Базовые таблицы | Ранние |
| 0016_add_cons_statuses | Добавлены статусы консолидаций | 2025-03 |
| 0017_fix_cons_enum | Исправление enum | 2025-03 |
| 0018_add_analytics_snapshots | Таблицы аналитики | 2025-03 |
| 0019_add_fx_calc_fields | FX поля в PL | 2025-03 |
| 0020_add_pl_places | places в PL | 2025-03 |
| 0021_add_user_avatar | avatar в users | 2025-03 |
| 0022_add_first_login_token | first_login_token | 2025-03 |
| 0023_add_user_is_active | is_active флаг | 2025-03 |
| 0024_add_consolidation_capacity | capacity поля | 2025-03 |
| 0025_add_consolidation_calculator | calculator поля | 2025-03 |
| 0026_change_expense_title_to_type | title → type | 2025-03 |
| 0027_add_leg2_source_of_truth_fields | leg2_manual*, allocatedLeg2Usd | 2025-03 |
| 0028_add_consolidation_client_price_snapshot | client_price_snapshot | 2025-03 |
| 0029_add_additional_docs_support | Поддержка доп. документов | 2025-03 |
| 0030_add_consolidation_driver_fields | driver_name, driver_contacts | 2025-03 |
| 0031_add_leads_table | Таблица leads | 2025-03 |
| 0032_add_consolidation_planned_arrival_date | planned_arrival_date | 2025-03 |

---

## 7. Used vs Unused Code Inventory

### 7.1 Используемый код

#### Routes (все используются)
- ✅ `auth.js` — Активно
- ✅ `users.js` — Активно
- ✅ `clients.js` — Активно
- ✅ `pl.js` — Активно
- ✅ `leads.js` — Активно
- ✅ `consolidations.js` — Активно
- ✅ `analytics.js` — Активно
- ✅ `fx.js` — Активно
- ✅ `import.js` — Активно
- ✅ `health.js` — Активно

#### Services
- ✅ `consolidations.js` — Используется (nextConsNumber)
- ✅ `cons-validators.js` — Используется (ensureAllPLsAreToLoad)
- ✅ `storage.js` — Используется (savePLFile, getUploadsRootAbs)

#### Lib
- ✅ `phone.js` — Используется (normalizePhone, generatePhoneVariants)
- ✅ `phone.test.js` — Unit тесты

#### Scripts
- ✅ `migrate-prod-safe.js` — Используется для production миграций
- ✅ `seed-user.js` — Используется для создания пользователей
- ✅ `reset-password.js` — Ручной скрипт (используется при необходимости)
- ✅ `build-analytics-snapshots.js` — Cron job для аналитики

### 7.2 Потенциально неиспользуемый/legacy код

#### Database columns (требуют проверки)

| Column | Table | Проверка | Рекомендация |
|--------|-------|----------|--------------|
| `leg2_amount` | pl | `SELECT COUNT(*) FROM pl WHERE leg2_amount != '0'` | Удалить если 0 |
| `leg2_currency` | pl | Всегда 'USD'? | Удалить если да |
| `leg2_amount_usd` | pl | `SELECT COUNT(*) FROM pl WHERE leg2_amount_usd != '0'` | Удалить после миграции |
| `machine_cost_share` | consolidation_pl | `SELECT COUNT(*) FROM consolidation_pl WHERE machine_cost_share != '0'` | Удалить если 0 |
| `fx_source` | pl | `SELECT COUNT(*) FROM pl WHERE fx_source IS NOT NULL` | Удалить если 0 |
| `fx_date` | pl | `SELECT COUNT(*) FROM pl WHERE fx_date IS NOT NULL` | Удалить если 0 |
| `fx_usd_kgs` | pl | `SELECT COUNT(*) FROM pl WHERE fx_usd_kgs IS NOT NULL` | Удалить если 0 |
| `fx_cny_kgs` | pl | `SELECT COUNT(*) FROM pl WHERE fx_cny_kgs IS NOT NULL` | Удалить если 0 |
| `fx_saved_at` | pl | `SELECT COUNT(*) FROM pl WHERE fx_saved_at IS NOT NULL` | Удалить если 0 |

#### Package dependencies

| Package | Используется | Рекомендация |
|---------|--------------|--------------|
| `bcrypt` | ❌ Нет (используется bcryptjs) | Удалить |
| `bcryptjs` | ✅ Да | Оставить |
| `xlsx` | ✅ Да (import.js, pl.js export) | Оставить |
| `xml2js` | ✅ Да (fx.js) | Оставить |

### 7.3 Legacy code paths

| Путь | Локация | Статус | Действие |
|------|---------|--------|----------|
| Legacy conversion | leads.js:298-320 | Deprecated | Убедиться что фронт не использует, затем удалить |
| Leg2 legacy fields | schema.js | Deprecated | Удалить после миграции данных |
| Machine cost share | schema.js | Deprecated | Удалить после проверки |

---

## 8. Technical Debt & Risks

### 8.1 Critical Risks

#### CR-1: Double Source of Truth for Leg2 Prices

**Описание:** PL.leg2ManualAmountUsd и consolidation_pl.allocatedLeg2Usd могут расходиться.

**Влияние:** Неправильные расчёты прибыли, путаница в отчётах.

**Митигация:**
```sql
-- Проверка расхождений
SELECT 
  p.id, p.pl_number,
  p.leg2_manual_amount_usd as pl_value,
  cp.allocated_leg2_usd as cons_value,
  ABS(COALESCE(p.leg2_manual_amount_usd, 0) - COALESCE(cp.allocated_leg2_usd, 0)) as diff
FROM pl p
JOIN consolidation_pl cp ON cp.pl_id = p.id
WHERE ABS(COALESCE(p.leg2_manual_amount_usd, 0) - COALESCE(cp.allocated_leg2_usd, 0)) > 0.01;
```

**Решение:** Создать view или функцию для получения "effective leg2":
```sql
CREATE OR REPLACE FUNCTION get_pl_leg2_usd(pl_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  in_consolidation BOOLEAN;
  cons_leg2 NUMERIC;
  manual_leg2 NUMERIC;
BEGIN
  SELECT EXISTS(SELECT 1 FROM consolidation_pl WHERE pl_id = $1) INTO in_consolidation;
  
  IF in_consolidation THEN
    SELECT allocated_leg2_usd INTO cons_leg2
    FROM consolidation_pl WHERE pl_id = $1;
    RETURN cons_leg2;
  ELSE
    SELECT leg2_manual_amount_usd INTO manual_leg2
    FROM pl WHERE id = $1;
    RETURN manual_leg2;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### CR-2: PL Status Auto-Sync on Consolidation Change

**Описание:** При изменении статуса консолидации все входящие PL автоматически получают тот же статус.

**Влияние:** PL может "откатиться" в предыдущий статус если консолидация движется назад.

**Митигация:** Добавить проверку на движение назад:
```javascript
const RANK = new Map([/* ... */]);

if (body.status && before.status !== body.status) {
  const fromRank = RANK.get(before.status);
  const toRank = RANK.get(body.status);
  const isMovingBackward = toRank < fromRank;
  
  if (isMovingBackward) {
    // Проверить что нет PL с более поздним статусом
    // или запретить движение назад
  }
}
```

#### CR-3: Missing Transaction in Bulk PL Update

**Описание:** PUT /api/consolidations/:id/pl выполняет множество операций без транзакции.

**Влияние:** Частичное применение изменений при ошибке.

**Митигация:** Обернуть в `db.transaction()`.

### 8.2 High Risks

#### HR-1: Analytics Tables Growth

**Описание:** Таблицы `analytics_daily_*` растут бесконечно (1 запись/день × количество статусов).

**Влияние:** Раздутие БД, замедление запросов.

**Митигация:**
```sql
-- Retention policy (хранить 2 года)
DELETE FROM analytics_daily_pl_status WHERE day < NOW() - INTERVAL '2 years';
DELETE FROM analytics_daily_weight_status WHERE day < NOW() - INTERVAL '2 years';
DELETE FROM analytics_daily_snapshots WHERE day < NOW() - INTERVAL '2 years';
```

#### HR-2: Base64 Avatars in Database

**Описание:** Поле `users.avatar` хранит base64 data URLs.

**Влияние:** Раздутие БД, медленные запросы.

**Митигация:** Перейти на файловое хранение:
```javascript
// Вместо base64 в БД:
const avatarPath = `/uploads/avatars/${userId}.jpg`;
await fs.writeFile(avatarPath, buffer);
await db.update(users).set({ avatar: `/api/users/${userId}/avatar` });
```

#### HR-3: FX Fallback to Hardcoded Values

**Описание:** При недоступности NBKR используются фиксированные курсы (87.5, 12.1).

**Влияние:** Неправильные расчёты при длительном отказе NBKR.

**Митигация:** Хранить последний успешный курс в БД или кэше.

### 8.3 Medium Risks

| ID | Риск | Описание | Митигация |
|----|------|----------|-----------|
| MR-1 | Missing rate limits | Некоторые endpoints без rate limit | Добавить во все routes |
| MR-2 | No request validation | Некоторые PUT без Zod schema | Добавить validation |
| MR-3 | Error stack in logs | Раскрывает пути в production | Убрать stack в production |
| MR-4 | No DB retry logic | При кратковременном отказе — падение | Добавить connection retry |

---

## 9. Cleanup Recommendations

### 9.1 Можно безопасно удалить

```bash
# Удаление неиспользуемой зависимости
npm uninstall bcrypt  # оставить только bcryptjs
```

```sql
-- После проверки что данные не используются:
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_amount;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_currency;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_amount_usd;
ALTER TABLE consolidation_pl DROP COLUMN IF EXISTS machine_cost_share;
```

### 9.2 Требует проверки перед удалением

```sql
-- Проверить использование FX полей
SELECT 
  'fx_source' as field, COUNT(*) as usage FROM pl WHERE fx_source IS NOT NULL
UNION ALL
SELECT 'fx_date', COUNT(*) FROM pl WHERE fx_date IS NOT NULL
UNION ALL
SELECT 'fx_usd_kgs', COUNT(*) FROM pl WHERE fx_usd_kgs IS NOT NULL
UNION ALL
SELECT 'fx_cny_kgs', COUNT(*) FROM pl WHERE fx_cny_kgs IS NOT NULL
UNION ALL
SELECT 'fx_saved_at', COUNT(*) FROM pl WHERE fx_saved_at IS NOT NULL;

-- Если все counts = 0 — можно удалить:
ALTER TABLE pl DROP COLUMN IF EXISTS fx_source;
ALTER TABLE pl DROP COLUMN IF EXISTS fx_date;
ALTER TABLE pl DROP COLUMN IF EXISTS fx_usd_kgs;
ALTER TABLE pl DROP COLUMN IF EXISTS fx_cny_kgs;
ALTER TABLE pl DROP COLUMN IF EXISTS fx_saved_at;
```

### 9.3 Legacy code для рефакторинга

| Приоритет | Задача | Файл | Описание |
|-----------|--------|------|----------|
| High | Убрать legacy conversion | leads.js:298-320 | Требовать clientResolution всегда |
| High | Добавить transaction | consolidations.js:280-380 | PUT /:id/pl в транзакцию |
| Medium | Унифицировать поля | pl.js | Привести names к единому виду |
| Medium | Добавить effective leg2 view | schema.js | Функция/View для получения leg2 |

---

## 10. Top 10 Priority Actions

| # | Действие | Сложность | Влияние | ETA |
|---|----------|-----------|---------|-----|
| 1 | Добавить транзакцию в PUT /consolidations/:id/pl | Low | 🔴 Critical | 1-2 часа |
| 2 | Audit leg2 цен — проверить расхождения | Medium | 🔴 Critical | 2-4 часа |
| 3 | Добавить retention policy для analytics | Low | 🔴 Critical | 1 час |
| 4 | Удалить bcrypt, оставить bcryptjs | Low | 🟠 High | 15 минут |
| 5 | Убрать error.stack из production logs | Low | 🟠 High | 30 минут |
| 6 | Добавить auth guard на /api/analytics | Low | 🟠 High | 15 минут |
| 7 | Проверить использование legacy conversion фронтом | Medium | 🟠 High | 1-2 часа |
| 8 | Добавить DB connection retry | Medium | 🟠 High | 2-3 часа |
| 9 | Мигрировать avatars из base64 в файлы | High | 🟡 Medium | 4-8 часов |
| 10 | Удалить deprecated поля leg2* | Medium | 🟡 Medium | 2-4 часа |

---

## 11. Unknowns / Needs Confirmation

### UC-1: FX поля в PL

**Вопрос:** Где используются поля `fxSource`, `fxDate`, `fxUsdKgs`, `fxCnyKgs`, `fxSavedAt` в таблице `pl`?

**Проверка:**
```bash
grep -r "fxSource\|fxDate\|fxUsdKgs\|fxCnyKgs\|fxSavedAt" server/ --include="*.js"
```

**Результат:** Только определения в schema.js, записи/чтения не найдены.

**Рекомендация:** Либо реализовать сохранение FX при расчёте, либо удалить поля.

### UC-2: Calculator snapshot в leads

**Вопрос:** Используется ли `leads.calculatorSnapshot` после конвертации в PL?

**Проверка:** 
```bash
grep -r "calculatorSnapshot" server/ --include="*.js"
```

**Результат:** Записывается при создании lead, копируется в `pl.calculator` при конвертации.

**Статус:** ✅ Используется корректно (история расчёта).

### UC-3: Analytics cron job

**Вопрос:** Запускается ли `build-analytics-snapshots.js` автоматически?

**Проверка:** 
```bash
cat server/crontab 2>/dev/null || echo "No crontab found"
ls -la /etc/cron.d/mylogistics 2>/dev/null || echo "No cron config"
```

**Рекомендация:** Настроить cron:
```cron
# Каждый день в 3:00 AM
0 3 * * * cd /path/to/server && NODE_ENV=production node scripts/build-analytics-snapshots.js >> /var/log/analytics.log 2>&1
```

### UC-4: Expense title vs type

**Вопрос:** В миграции 0026 поле `title` переименовано в `type`, но везде ли это учтено?

**Проверка:**
```bash
grep -r "expense.*title\|title.*expense" server/ --include="*.js"
```

**Результат:** В consolidations.js используется `type`.

**Статус:** ✅ Консистентность соблюдена.

### UC-5: First login flow

**Вопрос:** Используется ли first login flow в production?

**Проверка:**
```sql
SELECT COUNT(*) FROM users WHERE first_login_token IS NOT NULL;
```

**Рекомендация:** Если используется — документировать процесс генерации токенов для админов.

---

## Приложение A: SQL для аудита

### A.1 Проверка расхождений leg2 цен

```sql
-- Найти PL в консолидациях с расходящимися ценами
SELECT 
  p.id,
  p.pl_number,
  p.name as pl_name,
  c.cons_number,
  p.leg2_manual_amount_usd as pl_leg2_manual,
  cp.allocated_leg2_usd as cons_allocated,
  ABS(COALESCE(p.leg2_manual_amount_usd::numeric, 0) - 
      COALESCE(cp.allocated_leg2_usd::numeric, 0)) as difference,
  CASE 
    WHEN ABS(COALESCE(p.leg2_manual_amount_usd::numeric, 0) - 
             COALESCE(cp.allocated_leg2_usd::numeric, 0)) > 0.01 
    THEN 'MISMATCH' 
    ELSE 'OK' 
  END as status
FROM pl p
JOIN consolidation_pl cp ON cp.pl_id = p.id
JOIN consolidations c ON c.id = cp.consolidation_id
ORDER BY difference DESC;
```

### A.2 Проверка использования FX полей

```sql
SELECT 
  'fx_source' as field,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE fx_source IS NOT NULL) as non_null,
  COUNT(DISTINCT fx_source) as unique_values
FROM pl
UNION ALL
SELECT 
  'fx_date',
  COUNT(*),
  COUNT(*) FILTER (WHERE fx_date IS NOT NULL),
  COUNT(DISTINCT fx_date)
FROM pl
UNION ALL
SELECT 
  'fx_usd_kgs',
  COUNT(*),
  COUNT(*) FILTER (WHERE fx_usd_kgs IS NOT NULL),
  COUNT(DISTINCT fx_usd_kgs)
FROM pl;
```

### A.3 Размер analytics таблиц

```sql
SELECT 
  'analytics_daily_snapshots' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('analytics_daily_snapshots')) as size
UNION ALL
SELECT 
  'analytics_daily_pl_status',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('analytics_daily_pl_status'))
UNION ALL
SELECT 
  'analytics_daily_weight_status',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('analytics_daily_weight_status'));
```

### A.4 Размер avatar данных

```sql
SELECT 
  COUNT(*) as users_with_avatar,
  pg_size_pretty(sum(pg_column_size(avatar))) as total_avatar_size,
  pg_size_pretty(avg(pg_column_size(avatar))) as avg_avatar_size,
  max(pg_column_size(avatar)) as max_avatar_bytes
FROM users 
WHERE avatar IS NOT NULL;
```

### A.5 Проверка legacy полей

```sql
-- Проверка leg2 legacy полей
SELECT 
  COUNT(*) FILTER (WHERE leg2_amount IS NOT NULL AND leg2_amount != '0') as leg2_amount_used,
  COUNT(*) FILTER (WHERE leg2_amount_usd IS NOT NULL AND leg2_amount_usd != '0') as leg2_amount_usd_used,
  COUNT(*) FILTER (WHERE leg2_manual_amount_usd IS NOT NULL AND leg2_manual_amount_usd != '0') as leg2_manual_used
FROM pl;

-- Проверка machine_cost_share
SELECT 
  COUNT(*) FILTER (WHERE machine_cost_share IS NOT NULL AND machine_cost_share != '0') as used,
  COUNT(*) FILTER (WHERE allocated_leg2_usd IS NOT NULL AND allocated_leg2_usd != '0') as allocated_used
FROM consolidation_pl;
```

---

## Приложение B: Рекомендуемые миграции

### B.1 Удаление legacy полей

```sql
-- Migration: remove_legacy_fields.sql
-- Предварительно выполнить проверки из Приложения A!

BEGIN;

-- Удалить legacy leg2 поля
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_amount;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_currency;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_amount_usd;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_usd_per_kg;
ALTER TABLE pl DROP COLUMN IF EXISTS leg2_usd_per_m3;

-- Удалить legacy machine_cost_share
ALTER TABLE consolidation_pl DROP COLUMN IF EXISTS machine_cost_share;

-- Удалить неиспользуемые FX поля (если проверки показали 0 использований)
-- ALTER TABLE pl DROP COLUMN IF EXISTS fx_source;
-- ALTER TABLE pl DROP COLUMN IF EXISTS fx_date;
-- ALTER TABLE pl DROP COLUMN IF EXISTS fx_usd_kgs;
-- ALTER TABLE pl DROP COLUMN IF EXISTS fx_cny_kgs;
-- ALTER TABLE pl DROP COLUMN IF EXISTS fx_saved_at;

COMMIT;
```

### B.2 Создание функции effective_leg2

```sql
-- Migration: add_effective_leg2_function.sql

CREATE OR REPLACE FUNCTION get_pl_effective_leg2_usd(p_pl_id INTEGER)
RETURNS NUMERIC(15, 2) AS $$
DECLARE
  v_consolidation_id UUID;
  v_allocated NUMERIC(15, 2);
  v_manual NUMERIC(15, 2);
BEGIN
  -- Проверить, находится ли PL в консолидации
  SELECT consolidation_id INTO v_consolidation_id
  FROM consolidation_pl
  WHERE pl_id = p_pl_id
  LIMIT 1;
  
  IF v_consolidation_id IS NOT NULL THEN
    -- Вернуть allocated из консолидации
    SELECT allocated_leg2_usd INTO v_allocated
    FROM consolidation_pl
    WHERE pl_id = p_pl_id;
    RETURN COALESCE(v_allocated, 0);
  ELSE
    -- Вернуть manual значение из PL
    SELECT leg2_manual_amount_usd INTO v_manual
    FROM pl
    WHERE id = p_pl_id;
    RETURN COALESCE(v_manual, 0);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Примеры использования:
-- SELECT get_pl_effective_leg2_usd(123);
-- SELECT id, name, get_pl_effective_leg2_usd(id) as leg2_usd FROM pl;
```

### B.3 Retention policy для analytics

```sql
-- Migration: add_analytics_retention.sql

-- Создать функцию очистки
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_daily_pl_status 
  WHERE day < CURRENT_DATE - INTERVAL '730 days';  -- 2 года
  
  DELETE FROM analytics_daily_weight_status 
  WHERE day < CURRENT_DATE - INTERVAL '730 days';
  
  DELETE FROM analytics_daily_snapshots 
  WHERE day < CURRENT_DATE - INTERVAL '730 days';
END;
$$ LANGUAGE plpgsql;

-- Настроить cron (требуется pg_cron)
-- SELECT cron.schedule('0 4 * * 0', 'SELECT cleanup_old_analytics()');
```

---

**Конец отчёта**

*Документ составлен на основе аудита кода myLogistics/server.*
*Все выводы основаны на фактическом состоянии репозитория на момент 2026-03-22.*
