# Текущее состояние продукта — myLogistics

**Версия документа:** 3.0 (финальная)  
**Дата:** 7 марта 2026  
**Ветка:** analysis/current-product-state

---

## 1. Сущности системы

### 1.1. clients (Клиенты)

**Найдено в:** `server/db/schema.js`

**Поля:**
- id, name (not null), phone, phone2, email, notes, company, normalizedName, createdAt

**Связи:**
- Один клиент → много PL (через clientId)

---

### 1.2. pl (Грузы / Packing Lists)

**Найдено в:** `server/db/schema.js`

**Поля:**
- Основные: id, plNumber, clientId (FK), name, weight, volume, places, incoterm
- Адрес/отправитель: pickupAddress, shipperName, shipperContacts
- Статус: status (default: 'draft')
- Финансы: clientPrice, calculator (jsonb)
- Калькулятор с валютами: leg1Amount, leg1Currency, leg1AmountUsd, leg1UsdPerKg, leg1UsdPerM3, leg2Amount, leg2Currency, leg2AmountUsd, leg2UsdPerKg, leg2UsdPerM3, fxSource, fxDate, fxUsdKgs, fxCnyKgs, fxSavedAt
- Ответственный: responsibleUserId (FK)
- createdAt

**Связи:**
- Принадлежит клиенту
- Имеет много документов, комментариев, событий
- Может быть в консолидации (через consolidationPl)

---

### 1.3. plDocuments (Документы PL)

**Найдено в:** `server/db/schema.js`

**Поля:**
- id, plId (FK), docType, name, fileName, mimeType, sizeBytes, storagePath
- status: 'pending' | 'reviewed' | 'approved' | 'rejected'
- note, uploadedBy, uploadedAt, updatedAt

**Ограничения:**
- Уникальность: один тип документа на PL (uqDocPerType)

**Связи:**
- Имеет историю статусов (plDocStatusHistory)

---

### 1.4. plDocStatusHistory (История статусов документов)

**Найдено в:** `server/db/schema.js`

**Поля:** id, docId (FK), oldStatus, newStatus, note, changedBy, changedAt

---

### 1.5. plComments (Комментарии PL)

**Найдено в:** `server/db/schema.js`

**Поля:** id, plId (FK), userId (FK), author, body, createdAt

---

### 1.6. plEvents (События PL)

**Найдено в:** `server/db/schema.js`

**Поля:** id, plId (FK), type, message, meta (jsonb), actorUserId (FK), createdAt

**Типы событий в коде:**
- pl.created — создание PL
- pl.status_changed — изменение статуса
- pl.responsible_assigned — назначение ответственного
- pl.comment_added — добавление комментария
- pl.document_uploaded — загрузка документа

---

### 1.7. consolidations (Консолидации)

**Найдено в:** `server/db/schema.js`

**Поля:** id, consNumber, title, status, createdAt, updatedAt

**Статусы (enum):** to_load, loaded, to_customs, released, kg_customs, collect_payment, delivered, closed

**Связи:**
- Связь с PL через consolidationPl (many-to-many)
- Имеет историю статусов (consolidationStatusHistory)

---

### 1.8. users (Пользователи)

**Найдено в:** `server/db/schema.js`

**Поля:** id, login, passwordHash, name, phone, email, role, createdAt

**Роли:** admin, logist, user

---

### 1.9. analyticsDailySnapshots (Аналитика: снапшоты)

**Найдено в:** `server/db/schema.js`

**Поля:** day, generatedAt, sourceTs, totalClients, inquiryClients, activeClients

**Назначение:** Хранение ежедневных метрик для графиков аналитики

---

### 1.10. analyticsDailyPlStatus (Аналитика: PL по статусам)

**Найдено в:** `server/db/schema.js`

**Поля:** day, status, plCount

---

### 1.11. analyticsDailyWeightStatus (Аналитика: вес по статусам)

**Найдено в:** `server/db/schema.js`

**Поля:** day, status, totalWeight

---

## 2. API endpoints

### 2.1. Auth
**Найдено в:** `server/routes/auth.js`

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

---

### 2.2. Users
**Найдено в:** `server/routes/users.js`

- GET /api/users (с фильтром по роли)

---

### 2.3. Clients
**Найдено в:** `server/routes/clients.js`

- GET /api/clients — список
- GET /api/clients/search — поиск
- POST /api/clients — создание
- PATCH /api/clients/:id — обновление
- DELETE /api/clients/:id — удаление (только если нет PL)

---

### 2.4. PL (основной)
**Найдено в:** `server/routes/pl.js`

- GET /api/pl — список
- GET /api/pl/:id — получить
- POST /api/pl — создание
- PUT /api/pl/:id — обновление
- DELETE /api/pl/:id — удаление
- PUT /api/pl/:id/responsible — назначить ответственного

**Документы (внутри PL routes):**
- GET /api/pl/:id/docs
- POST /api/pl/:id/docs
- GET /api/pl/:id/docs/:docId
- PATCH /api/pl/:id/docs/:docId
- DELETE /api/pl/:id/docs/:docId
- GET /api/pl/:id/docs/:docId/history

**Комментарии (внутри PL routes):**
- GET /api/pl/:id/comments
- POST /api/pl/:id/comments
- DELETE /api/pl/:id/comments/:commentId

**События:**
- GET /api/pl/:id/events

---

### 2.5. Consolidations
**Найдено в:** `server/routes/consolidations.js`

- GET /api/consolidations
- GET /api/consolidations/:id
- POST /api/consolidations
- PATCH /api/consolidations/:id
- DELETE /api/consolidations/:id
- POST /api/consolidations/:id/pl — добавить PL
- DELETE /api/consolidations/:id/pl/:plId — убрать PL
- PUT /api/consolidations/:id/pl — установить список PL
- GET /api/consolidations/:id/status-history

---

### 2.6. Analytics
**Найдено в:** `server/routes/analytics.js`

- GET /api/analytics?from=&to=&granularity= — получить аналитику

**Скрипт заполнения:** `server/scripts/build-analytics-snapshots.js`

---

### 2.7. FX (курсы валют)
**Найдено в:** `server/routes/fx.js`

- GET /api/fx/latest
- GET /api/fx/convert

---

## 3. Frontend

### 3.1. Основные страницы (Views)

| Страница | Файл | Функциональность |
|----------|------|------------------|
| CargoView | `src/views/CargoView.jsx` | Канбан доска, управление PL и консолидациями |
| ClientsView | `src/views/ClientsView.jsx` | Список клиентов, карточка клиента |
| AnalyticsPage | `src/views/AnalyticsPage.jsx` | Графики аналитики |
| LogisticsView | `src/views/LogisticsView.jsx` | Заглушка (пустая страница) |
| WarehousesView | `src/views/WarehousesView.jsx` | Минимальный список складов |

---

### 3.2. Основные компоненты

| Компонент | Файл | Назначение |
|-----------|------|------------|
| PLCard | `src/components/PLCard.jsx` | Карточка PL с 4 вкладками (Сведения, Документы, Комментарии, Хронология) |
| NewPLModal | `src/components/pl/NewPLModal.jsx` | Модальное окно создания PL |
| DocsList | `src/components/pl/DocsList.jsx` | Список документов PL |
| CommentsCard | `src/components/CommentsCard.jsx` | Комментарии к PL |
| CostCalculatorCard | `src/components/CostCalculatorCard.jsx` | Калькулятор себестоимости с валютами |
| KanbanBoard | `src/components/kanban/KanbanBoard.jsx` | Канбан доска (9 колонок) |
| KanbanPLCard | `src/components/kanban/KanbanPLCard.jsx` | Карточка PL в канбане |

---

## 4. Статусы

### 4.1. PL (11 статусов)
**Найдено в:** `src/constants/statuses.js`

Список: draft, awaiting_docs, awaiting_load, to_load, loaded, to_customs, released, kg_customs, collect_payment, closed, cancelled

**Канбан колонки (9):**
1. intake — draft
2. collect_docs — awaiting_docs
3. collect_cargo — awaiting_load
4. loading — to_load, loaded
5. cn_formalities — to_customs
6. in_transit — released
7. kg_customs — kg_customs
8. payment — collect_payment
9. closed_stage — closed, cancelled

---

### 4.2. Консолидации (8 статусов)
**Найдено в:** `server/db/schema.js`

Список: to_load, loaded, to_customs, released, kg_customs, collect_payment, delivered, closed

---

### 4.3. Документы (4 статуса)
**Найдено в:** `server/db/schema.js`, `src/components/pl/DocsList.jsx`

Сервер: pending, reviewed, approved, rejected
UI: uploaded, checked_by_logistic, recheck_ok, rejected

---

## 5. Функциональность по разделам

### 5.1. Авторизация

**Реализовано:**
- Модель users с ролями (admin, logist, user)
- Login/logout API
- Сессии через cookies
- Проверка прав доступа

**Найдено в:**
- `server/routes/auth.js`
- `server/db/schema.js` (users)
- `server/server.js`

**Отсутствует:**
- Регистрация пользователей через UI
- Восстановление пароля
- Смена пароля через UI

---

### 5.2. PL (Грузы)

**Реализовано:**
- CRUD операции
- Список PL с информацией о клиенте
- Детальная карточка PL с 4 вкладками
- 11 статусов, канбан (9 колонок)
- Drag & drop между колонками
- Назначение ответственного
- Поля: название, вес, объём, количество мест, инкотерм, адрес забора, отправитель, контакты

**Найдено в:**
- `server/routes/pl.js`
- `src/views/CargoView.jsx`
- `src/components/PLCard.jsx`
- `src/components/pl/NewPLModal.jsx`

**Реализовано частично:**
- Warehouses — есть модель и выбор в PL, но нет полноценного UI управления

**Отсутствует:**
- Массовые операции с PL
- Поиск и фильтрация PL (кроме фильтра по клиенту)

---

### 5.3. Клиенты

**Реализовано:**
- CRUD операции
- Поиск с транслитерацией
- Автосоздание при создании PL
- Просмотр всех PL клиента

**Найдено в:**
- `server/routes/clients.js`
- `src/views/ClientsView.jsx`

**Отсутствует:**
- История изменений клиента
- Сегментация клиентов

---

### 5.4. Консолидации

**Реализовано:**
- CRUD операции
- Добавление/удаление PL
- 8 статусов консолидации
- История изменений статусов

**Найдено в:**
- `server/routes/consolidations.js`
- `server/db/schema.js`
- `src/views/CargoView.jsx`

**Реализовано частично:**
- UI минимальный — есть создание и управление списком PL, но нет детального просмотра содержимого

**Отсутствует:**
- Визуализация содержимого консолидации
- Автоматический расчёт веса/объёма консолидации
- Агрегация финансов по консолидации

---

### 5.5. Документы

**Реализовано:**
- Загрузка файлов на диск
- 3 типа документов: invoice, packing_list, other
- 4 статуса с историей изменений
- Уникальность: один тип на PL

**Найдено в:**
- `server/routes/pl.js`
- `server/db/schema.js`
- `src/components/pl/DocsList.jsx`

**Отсутствует:**
- Предпросмотр документов (только скачивание)
- Версионирование

---

### 5.6. Комментарии

**Реализовано:**
- CRUD операции
- UI в карточке PL
- Автор и дата

**Найдено в:**
- `server/routes/pl.js`
- `server/db/schema.js`
- `src/components/CommentsCard.jsx`

---

### 5.7. Хронология / Timeline

**Реализовано:**
- Модель событий plEvents
- API для получения событий
- Вкладка "Хронология" в PL
- Автоматическое создание событий при ключевых действиях

**Найдено в:**
- `server/db/schema.js`
- `server/routes/pl.js`
- `src/components/PLCard.jsx`

**Примечание:** События создаются автоматически, но нет ручного добавления событий и нет фильтрации по типу.

---

### 5.8. Калькулятор

**Реализовано:**
- Поле цены для клиента (clientPrice)
- JSONB снапшот калькулятора
- Расчёт себестоимости (2 плеча + сборы)
- Расчёт маржи и прибыли
- Плотность груза
- Рекомендация: по весу или объёму
- Поддержка 3 валют (USD, KGS, CNY)
- Курсы валют от НБКР
- Сохранение курсов на момент расчёта

**Найдено в:**
- `server/db/schema.js`
- `server/routes/fx.js`
- `src/components/CostCalculatorCard.jsx`

**Отсутствует:**
- История изменений цены
- Финансовая агрегация по клиенту/консолидации

---

### 5.9. Аналитика

**Реализовано:**
- 3 таблицы для снапшотов
- API /api/analytics
- 3 графика в UI
- Скрипт заполнения снапшотов
- Поддержка гранулярности: день, неделя, месяц

**Найдено в:**
- `server/db/schema.js`
- `server/routes/analytics.js`
- `server/scripts/build-analytics-snapshots.js`
- `src/views/AnalyticsPage.jsx`

**Реализовано частично:**
- Автоматическое заполнение снапшотов — скрипт есть, но нет настроенного cron job

---

## 6. Функции, которые уже существуют и должны развиваться без дублирования

Список функциональности, которую не следует создавать заново, а развивать существующую:

1. **Система статусов PL** — 11 статусов с канбаном уже реализована
2. **Система документов** — загрузка, статусы, история уже есть
3. **Комментарии к PL** — полноценная реализация с CRUD
4. **Калькулятор себестоимости** — с валютами и снапшотами курсов
5. **Консолидации** — модель, API, связи с PL существуют
6. **Событийная система (timeline)** — plEvents с автоматическим созданием
7. **Аналитика на снапшотах** — таблицы, API, UI графиков
8. **Назначение ответственного** — через responsibleUserId
9. **Поиск клиентов** — с транслитерацией
10. **Drag & drop** — в канбане реализован

---

**Конец документа**
