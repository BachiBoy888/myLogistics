# Current Product State — myLogistics

**Дата анализа:** 7 марта 2026  
**Ветка:** analysis/current-product-state  
**Версия документа:** 1.0

---

## Общая информация о проекте

myLogistics — система управления логистическими операциями (Packing Lists, Consignments).  
Стек: React + Vite + Tailwind (frontend), Fastify + Drizzle ORM + PostgreSQL (backend).

**Найдено в коде:**
- 76 файлов исходного кода (исключая node_modules)
- 21 миграция базы данных
- 8 API routes на backend
- 5 основных views на frontend

---

## 1. Основные сущности системы

### 1.1. Clients (Клиенты)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  phone2: text("phone2"),
  email: text("email"),
  notes: text("notes"),
  company: text("company"),
  normalizedName: text("normalized_name"), // для поиска
  createdAt: timestamp("created_at").defaultNow(),
});
```

**API (найдено в `server/routes/clients.js`):**
- `GET /api/clients` — список всех клиентов
- `GET /api/clients/search?q=` — поиск клиентов
- `POST /api/clients` — создание клиента
- `PATCH /api/clients/:id` — обновление клиента
- `DELETE /api/clients/:id` — удаление клиента (только если нет PL)

**UI (найдено в `src/views/ClientsView.jsx`):**
- Список клиентов слева
- Карточка клиента справа с полями: компания, имя, телефоны, email, заметки
- Интеграция с PL (показывает PL клиента)
- Кнопка удаления клиента

**Связи:**
- Один клиент → много PL (client_id в таблице pl)

---

### 1.2. PL (Packing List / Груз)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const pl = pgTable("pl", {
  id: serial("id").primaryKey(),
  plNumber: text("pl_number"),
  clientId: integer("client_id").notNull(),
  
  // Основные данные
  name: text("name").notNull(),
  weight: numeric("weight", { precision: 12, scale: 3 }),
  volume: numeric("volume", { precision: 12, scale: 3 }),
  places: integer("places").default(1), // Количество мест
  incoterm: text("incoterm"), // EXW | FOB
  pickupAddress: text("pickup_address"),
  shipperName: text("shipper_name"),
  shipperContacts: text("shipper_contacts"),
  status: text("status").default("draft"),
  
  // Финансы
  clientPrice: numeric("client_price", { precision: 12, scale: 2 }).default("0"),
  
  // Калькулятор (JSONB)
  calculator: jsonb("calculator").default(sql`'{}'::jsonb`).notNull(),
  
  // Поля для калькулятора с валютами
  leg1Amount, leg1Currency, leg1AmountUsd, leg1UsdPerKg, leg1UsdPerM3,
  leg2Amount, leg2Currency, leg2AmountUsd, leg2UsdPerKg, leg2UsdPerM3,
  fxSource, fxDate, fxUsdKgs, fxCnyKgs, fxSavedAt,
  
  // Ответственный
  responsibleUserId: uuid("responsible_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**API (найдено в `server/routes/pl.js`):**
- `GET /api/pl` — список всех PL
- `GET /api/pl/:id` — один PL
- `POST /api/pl` — создание PL
- `PUT /api/pl/:id` — обновление PL
- `DELETE /api/pl/:id` — удаление PL
- `PUT /api/pl/:id/responsible` — назначение ответственного
- `GET /api/pl/:id/events` — события PL

**UI (найдено в `src/components/PLCard.jsx`, `src/views/CargoView.jsx`):**
- Карточка PL с табами: Сведения / Документы / Комментарии / Хронология
- Поля: название груза, вес, объём, количество мест, инкотерм, адрес забора, отправитель, контакты
- Калькулятор себестоимости
- Drag & drop в канбане

**Статусы PL (найдено в `src/constants/statuses.js`):**
```javascript
["draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
 "to_customs", "released", "kg_customs", "collect_payment", "closed", "cancelled"]
```

**Канбан (9 колонок):**
1. Обращение (draft)
2. Сбор документов (awaiting_docs)
3. Сбор груза (awaiting_load)
4. Погрузка (to_load, loaded)
5. Оформление Китай (to_customs)
6. В пути (released)
7. Растаможка (kg_customs)
8. Оплата (collect_payment)
9. Закрыто (closed, cancelled)

---

### 1.3. Consolidations (Консолидации)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const consolidations = pgTable("consolidations", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  consNumber: text("cons_number").notNull(), // CONS-YYYY-N
  title: text("title"),
  status: consolidationStatusEnum("status").notNull().default("loaded"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consolidationPl = pgTable("consolidation_pl", {
  consolidationId: uuid("consolidation_id").notNull(),
  plId: integer("pl_id").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**API (найдено в `server/routes/consolidations.js`):**
- `GET /api/consolidations` — список консолидаций
- `GET /api/consolidations/:id` — одна консолидация
- `POST /api/consolidations` — создание
- `PATCH /api/consolidations/:id` — обновление
- `DELETE /api/consolidations/:id` — удаление
- `POST /api/consolidations/:id/pl` — добавление PL
- `DELETE /api/consolidations/:id/pl/:plId` — удаление PL
- `PUT /api/consolidations/:id/pl` — установка списка PL

**UI (найдено в `src/views/CargoView.jsx`):**
- Создание консолидации
- Добавление/удаление PL из консолидации
- Drag & drop PL между статусами

**Статусы консолидаций (8 статусов):**
`to_load`, `loaded`, `to_customs`, `released`, `kg_customs`, `collect_payment`, `delivered`, `closed`

---

### 1.4. Documents (Документы PL)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const plDocuments = pgTable("pl_documents", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  plId: integer("pl_id").notNull(),
  docType: text("doc_type").notNull(), // 'invoice' | 'packing_list' | ...
  name: text("name"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  storagePath: text("storage_path").notNull(),
  status: text("status").notNull().default("pending"), // pending | reviewed | approved | rejected
  note: text("note"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plDocStatusHistory = pgTable("pl_doc_status_history", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  docId: uuid("doc_id").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  note: text("note"),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**API (найдено в `server/routes/pl.js`):**
- `GET /api/pl/:id/docs` — список документов
- `POST /api/pl/:id/docs` — загрузка документа
- `GET /api/pl/:id/docs/:docId` — скачивание документа
- `PATCH /api/pl/:id/docs/:docId` — обновление статуса/примечания
- `DELETE /api/pl/:id/docs/:docId` — удаление документа
- `GET /api/pl/:id/docs/:docId/history` — история статусов

**UI (найдено в `src/components/pl/DocsList.jsx`):**
- Загрузка файлов
- Просмотр списка документов
- Изменение статуса (uploaded → checked_by_logistic → recheck_ok / rejected)
- Удаление документов
- История изменений

**Типы документов (найдено в `src/constants/docs.js`):**
- invoice — Инвойс
- packing_list — Packing List
- other — Другое

---

### 1.5. Comments (Комментарии PL)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const plComments = pgTable("pl_comments", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  plId: integer("pl_id").notNull(),
  userId: uuid("user_id"),
  author: text("author").notNull().default("Логист"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**API (найдено в `server/routes/pl.js`):**
- `GET /api/pl/:id/comments` — список комментариев
- `POST /api/pl/:id/comments` — добавление комментария
- `DELETE /api/pl/:id/comments/:commentId` — удаление комментария

**UI (найдено в `src/components/CommentsCard.jsx`):**
- Отображение списка комментариев
- Добавление нового комментария
- Удаление комментария

---

### 1.6. Events / Timeline (События PL)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const plEvents = pgTable("pl_events", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  plId: integer("pl_id").notNull(),
  type: text("type").notNull(), // 'pl.created' | 'pl.status_changed' | ...
  message: text("message").notNull(),
  meta: jsonb("meta").default(sql`'{}'::jsonb`),
  actorUserId: uuid("actor_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**API (найдено в `server/routes/pl.js`):**
- `GET /api/pl/:id/events` — список событий

**UI (найдено в `src/components/PLCard.jsx`):**
- Вкладка "Хронология" с таблицей событий

**Типы событий (найдено в коде):**
- pl.created — создание PL
- pl.status_changed — изменение статуса
- pl.responsible_assigned — назначение ответственного
- pl.comment_added — добавление комментария
- pl.document_uploaded — загрузка документа

---

### 1.7. Users (Пользователи)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const users = pgTable("users", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  login: text("login").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  role: text("role").notNull().default("user"), // admin | logist | user
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**API (найдено в `server/routes/users.js`, `server/routes/auth.js`):**
- `POST /api/auth/login` — вход
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь
- `GET /api/users?role=` — список пользователей (с фильтром по роли)

**Роли:**
- admin — администратор
- logist — логист (может быть ответственным за PL)
- user — обычный пользователь

---

### 1.8. Analytics Snapshots (Аналитика)

**Модель данных (найдено в `server/db/schema.js`):**
```javascript
export const analyticsDailySnapshots = pgTable("analytics_daily_snapshots", {
  day: timestamp("day", { withTimezone: false }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  sourceTs: timestamp("source_ts", { withTimezone: true }).notNull().defaultNow(),
  totalClients: integer("total_clients").notNull().default(0),
  inquiryClients: integer("inquiry_clients").notNull().default(0),
  activeClients: integer("active_clients").notNull().default(0),
});

export const analyticsDailyPlStatus = pgTable("analytics_daily_pl_status", {
  day: timestamp("day", { withTimezone: false }).notNull(),
  status: text("status").notNull(),
  plCount: integer("pl_count").notNull().default(0),
});

export const analyticsDailyWeightStatus = pgTable("analytics_daily_weight_status", {
  day: timestamp("day", { withTimezone: false }).notNull(),
  status: text("status").notNull(),
  totalWeight: numeric("total_weight", { precision: 15, scale: 3 }).notNull().default("0"),
});
```

**API (найдено в `server/routes/analytics.js`):**
- `GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month` — аналитика

**Скрипт заполнения (найдено в `server/scripts/build-analytics-snapshots.js`):**
- Ежедневное создание снапшотов
- Расчёт метрик на основе текущих данных

**UI (найдено в `src/views/AnalyticsPage.jsx`):**
- 3 графика: динамика клиентов, PL по статусам, динамика веса
- Выбор периода и гранулярности (день/неделя/месяц)

**Статус:** Реализовано частично — требуется настройка cron job для автоматического заполнения

---

## 2. Функциональность по разделам

### 2.1. Авторизация

**Реализовано:**
- ✅ Модель users с ролями (admin, logist, user)
- ✅ API login/logout/me
- ✅ Сессии через cookies
- ✅ Проверка прав (authGuard)

**Найдено в:**
- `server/db/schema.js` — модель users
- `server/routes/auth.js` — API
- `server/server.js` — middleware authGuard

**Отсутствует:**
- ❌ Регистрация пользователей (только через БД напрямую)
- ❌ Восстановление пароля
- ❌ Смена пароля через UI

---

### 2.2. PL (Грузы)

**Реализовано:**
- ✅ CRUD операции (создание, чтение, обновление, удаление)
- ✅ Список PL с клиентами
- ✅ Детальная карточка PL с табами
- ✅ 11 статусов с канбан-доской (9 колонок)
- ✅ Drag & drop между статусами
- ✅ Drag & drop между колонками канбана
- ✅ Назначение ответственного
- ✅ Поля: вес, объём, количество мест, инкотерм, адрес, отправитель, контакты

**Реализовано частично:**
- ⚠️ Warehouses (FOB склады) — есть модель, но UI минимальный

**Найдено в:**
- `server/db/schema.js` — модель pl
- `server/routes/pl.js` — API
- `src/views/CargoView.jsx` — канбан
- `src/components/PLCard.jsx` — карточка PL
- `src/components/pl/NewPLModal.jsx` — создание PL

**Отсутствует:**
- ❌ Массовые операции с PL
- ❌ Фильтрация и поиск PL (только по клиенту)

---

### 2.3. Clients (Клиенты)

**Реализовано:**
- ✅ CRUD операции
- ✅ Поиск клиентов с транслитерацией
- ✅ Автосоздание клиента при создании PL
- ✅ Привязка PL к клиенту
- ✅ Просмотр всех PL клиента

**Найдено в:**
- `server/db/schema.js` — модель clients
- `server/routes/clients.js` — API
- `src/views/ClientsView.jsx` — UI списка и карточки

**Отсутствует:**
- ❌ История изменений клиента
- ❌ Сегментация клиентов

---

### 2.4. Consolidations (Консолидации)

**Реализовано:**
- ✅ CRUD операции
- ✅ Добавление/удаление PL из консолидации
- ✅ Статусы консолидации (8 статусов)
- ✅ История изменений статусов

**Найдено в:**
- `server/db/schema.js` — модели consolidations, consolidationPl, consolidationStatusHistory
- `server/routes/consolidations.js` — API
- `src/views/CargoView.jsx` — UI (создание, управление)

**Отсутствует:**
- ❌ Визуализация консолидации (что внутри)
- ❌ Расчёт объёма/веса консолидации

---

### 2.5. Documents (Документы)

**Реализовано:**
- ✅ Загрузка файлов
- ✅ Хранение на диске (uploads/pl/<plId>/)
- ✅ 3 типа документов: invoice, packing_list, other
- ✅ Статусы документов: pending, reviewed, approved, rejected
- ✅ История изменений статусов
- ✅ Уникальность: один тип документа на PL

**Найдено в:**
- `server/db/schema.js` — модели plDocuments, plDocStatusHistory
- `server/routes/pl.js` — API (внутри pl routes)
- `src/components/pl/DocsList.jsx` — UI
- `src/constants/docs.js` — типы документов

**Отсутствует:**
- ❌ Предпросмотр документов (только скачивание)
- ❌ Версионирование документов

---

### 2.6. Timeline / Хронология

**Реализовано:**
- ✅ Модель событий plEvents
- ✅ API для получения событий
- ✅ Таб "Хронология" в карточке PL
- ✅ Автоматическое создание событий при:
  - Создании PL
  - Изменении статуса
  - Назначении ответственного
  - Добавлении комментария
  - Загрузке документа

**Найдено в:**
- `server/db/schema.js` — модель plEvents
- `server/routes/pl.js` — API + создание событий
- `src/components/PLCard.jsx` — вкладка "Хронология"

---

### 2.7. Comments (Комментарии)

**Реализовано:**
- ✅ Модель комментариев
- ✅ API CRUD
- ✅ UI в карточке PL (вкладка "Комментарии")
- ✅ Автор и дата

**Найдено в:**
- `server/db/schema.js` — модель plComments
- `server/routes/pl.js` — API
- `src/components/CommentsCard.jsx` — UI

---

### 2.8. Финансовая модель (Калькулятор)

**Реализовано:**
- ✅ Поля в PL: clientPrice (цена для клиента)
- ✅ JSONB поле calculator со снимком расчёта
- ✅ Расчёт себестоимости (2 плеча + таможня + прочие)
- ✅ Расчёт маржи и прибыли
- ✅ Плотность груза (кг/м³)
- ✅ Рекомендация: считать по весу или объёму
- ✅ Поддержка 3 валют: USD, KGS, CNY
- ✅ Курсы валют от NBKR
- ✅ Сохранение курсов на момент расчёта
- ✅ Пересчёт $/кг и $/м³ от суммы ставки

**Найдено в:**
- `server/db/schema.js` — поля PL (clientPrice, calculator, leg*, fx*)
- `server/routes/fx.js` — API курсов валют
- `src/components/CostCalculatorCard.jsx` — UI калькулятора

**Отсутствует:**
- ❌ История изменений цены
- ❌ Агрегация финансов по клиенту
- ❌ Агрегация финансов по консолидации

---

### 2.9. Аналитика

**Реализовано:**
- ✅ 3 снапшот-таблицы для аналитики
- ✅ API /api/analytics
- ✅ 3 графика в UI
- ✅ Скрипт заполнения снапшотов
- ✅ Поддержка гранулярности: день, неделя, месяц

**Найдено в:**
- `server/db/schema.js` — таблицы analytics*
- `server/routes/analytics.js` — API
- `server/scripts/build-analytics-snapshots.js` — скрипт
- `src/views/AnalyticsPage.jsx` — UI

**Реализовано частично:**
- ⚠️ Требуется настройка cron job для ежедневного запуска скрипта

---

## 3. UI Компоненты

### 3.1. Основные Views

| View | Файл | Описание |
|------|------|----------|
| CargoView | `src/views/CargoView.jsx` | Канбан доска с PL, консолидации |
| ClientsView | `src/views/ClientsView.jsx` | Список клиентов, карточка клиента |
| AnalyticsPage | `src/views/AnalyticsPage.jsx` | Графики аналитики |
| LogisticsView | `src/views/LogisticsView.jsx` | Пустой placeholder |
| WarehousesView | `src/views/WarehousesView.jsx` | Список складов (минимальный) |

### 3.2. Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| PLCard | `src/components/PLCard.jsx` | Карточка PL с 4 табами |
| NewPLModal | `src/components/pl/NewPLModal.jsx` | Модал создания PL |
| DocsList | `src/components/pl/DocsList.jsx` | Список документов |
| CommentsCard | `src/components/CommentsCard.jsx` | Комментарии |
| CostCalculatorCard | `src/components/CostCalculatorCard.jsx` | Калькулятор себестоимости |
| KanbanBoard | `src/components/kanban/KanbanBoard.jsx` | Канбан доска |
| KanbanPLCard | `src/components/kanban/KanbanPLCard.jsx` | Карточка PL в канбане |

---

## 4. API Routes

| Route | Файл | Описание |
|-------|------|----------|
| /api/auth/* | `server/routes/auth.js` | Авторизация |
| /api/users | `server/routes/users.js` | Пользователи |
| /api/clients/* | `server/routes/clients.js` | Клиенты |
| /api/pl/* | `server/routes/pl.js` | PL (основной) |
| /api/consolidations/* | `server/routes/consolidations.js` | Консолидации |
| /api/analytics | `server/routes/analytics.js` | Аналитика |
| /api/fx/* | `server/routes/fx.js` | Курсы валют |
| /api/health | `server/routes/health.js` | Health check |

---

## 5. Миграции базы данных

**Найдено:** 21 миграция в `server/drizzle/`

**Ключевые миграции:**
- `0016_add_cons_statuses.sql` — добавление статусов консолидации
- `0018_add_analytics_snapshots.sql` — таблицы аналитики
- `0019_add_fx_calc_fields.sql` — поля для калькулятора с валютами
- `0020_add_pl_places.sql` — поле places (количество мест)

---

## 6. Частично реализованные функции

### 6.1. Аналитика
- **Есть:** Модели, API, UI, скрипт заполнения
- **Нет:** Автоматический запуск по расписанию (cron)
- **Действие:** Настроить Render Cron Job для `build-analytics-snapshots.js`

### 6.2. Warehouses (Склады)
- **Есть:** Модель, справочник
- **Нет:** Полноценный UI управления
- **Используется:** Только для выбора FOB склада при создании PL

### 6.3. Финансовая агрегация
- **Есть:** Расчёт на уровне PL
- **Нет:** Суммы по клиенту, консолидации, периоду

### 6.4. Документы
- **Есть:** Загрузка, статусы, история
- **Нет:** Предпросмотр, версионирование

---

## 7. Важные наблюдения

### 7.1. Риск дублирования

**Финансовая модель:**
- Цена клиента хранится в двух местах: `pl.clientPrice` и внутри `pl.calculator.clientPrice`
- **Рекомендация:** Использовать только `pl.clientPrice`, убрать дублирование из calculator

**События и история:**
- Есть `plEvents` для общих событий
- Есть `plDocStatusHistory` для документов
- Есть `consolidationStatusHistory` для консолидаций
- **Рекомендация:** Рассмотреть unified event log если добавлять новые типы истории

### 7.2. Требует развития

**Калькулятор:**
- Сейчас: только 2 плеча + фиксированные сборы
- Можно развить: неограниченное число плеч, шаблоны маршрутов

**Статусы:**
- Сейчас: фиксированный pipeline
- Можно развить: кастомные статусы, переходы с условиями

**Аналитика:**
- Сейчас: daily snapshots
- Можно развить: real-time метрики, кастомные дашборды

### 7.3. Технический долг

**NB:** Поле `pl.calculator` хранит дублирующиеся данные (rate1Kg и т.д.), которые теперь есть в отдельных колонках. Рассмотреть миграцию для очистки.

**NB:** В `plDocStatusHistory` используется text для статусов, а не enum — нет строгой типизации.

---

## 8. Выводы для AI-агентов

### Что уже есть (не создавать заново):
1. ✅ Система статусов PL (11 статусов, канбан)
2. ✅ Система документов с историей статусов
3. ✅ Комментарии к PL
4. ✅ Калькулятор себестоимости с валютами
5. ✅ Консолидации с историей
6. ✅ Аналитика на снапшотах
7. ✅ Событийная система (timeline)

### Что нужно развивать:
1. ⚠️ Автоматизация аналитики (cron)
2. ⚠️ Финансовые агрегации (по клиенту, консолидации)
3. ⚠️ Улучшение UI warehouses
4. ⚠️ Предпросмотр документов

### Что отсутствует (можно создавать):
1. ❌ Регистрация/восстановление пароля
2. ❌ Массовые операции с PL
3. ❌ Поиск и фильтрация PL
4. ❌ Уведомления (email/push)
5. ❌ Экспорт данных (Excel/PDF)

---

**Документ создан:** 7 марта 2026  
**На основе анализа:** 76 файлов, 21 миграции, полный обзор schema и routes
