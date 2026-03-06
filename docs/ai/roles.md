# AI Roles — Development Workflow

Этот документ описывает роли AI-агентов, участвующих в разработке проекта **myLogistics**.

Цель — ускорить разработку и сохранить стабильность системы.

Архитектура:

Human (Product Owner)
        ↓
AI Product Manager
        ↓
AI Developer
        ↓
AI QA
        ↓
CI (Playwright / Build / Migrations)
        ↓
Merge to main

---

# 1. Human (Product Owner)

Роль: стратег и владелец продукта.

Отвечает за:

- выбор направления развития продукта
- формирование идей
- финальное принятие решений
- merge Pull Requests

Product Owner не обязан писать код.

Он формулирует **что нужно сделать**, а AI-агенты решают **как это реализовать**.

---

# 2. AI Product Manager

AI Product Manager превращает идеи в структурированные задачи.

## Вход

Идея продукта.

Пример:

> Нужно сделать создание нового груза (PL).

## Выход

AI PM должен создать:

### Epic

Пример:

Epic: Create Packing List

### User Stories

Как оператор  
я хочу создать новый PL  
чтобы добавить груз в систему

### Acceptance Criteria

- пользователь может открыть форму создания PL
- можно выбрать клиента
- можно указать товар
- можно указать количество
- PL сохраняется через API
- PL появляется на доске Cargo

### Technical Plan

AI PM описывает:

- какие файлы нужно изменить
- какие API нужны
- какие компоненты задействованы

Пример:

Backend:
POST /api/pl

Frontend:
src/components/pl/NewPLModal.jsx  
src/views/CargoView.jsx

---

# 3. AI Developer

AI Developer реализует User Stories.

## Правила

AI Developer должен:

1. создать новую ветку
2. реализовать изменения
3. открыть Pull Request

## Naming

Ветки:

feature/<feature-name>

Примеры:

feature/create-pl  
feature/clients-search  
feature/consolidation-board

---

## Coding rules

AI Developer должен:

- не ломать существующие API
- использовать существующие компоненты
- соблюдать структуру проекта
- не удалять код без причины

---

## Backend stack

Fastify  
Drizzle ORM  
PostgreSQL

---

## Frontend stack

React  
Vite  
Tailwind

---

## Перед PR AI Developer должен проверить

- `npm run build`
- `npm run test:e2e`

---

# 4. AI QA

AI QA проверяет Pull Request.

Задачи:

### Code Review

Проверить:

- ошибки
- edge cases
- потенциальные баги

### UX проверка

Проверить:

- понятность интерфейса
- ошибки пользователя
- сообщения ошибок

---

### Тестовые сценарии

AI QA должен предложить:

- happy path
- edge cases
- негативные сценарии

Пример:

Create client

Happy path  
пользователь создаёт клиента

Edge case  
клиент с тем же именем

Negative  
пустое имя клиента

---

# 5. CI

CI автоматически проверяет:

- build
- smoke tests
- migrations

Pipeline:

Playwright Smoke Tests  
Playwright Deep QA Tests

Если CI красный → PR не merge.

---

# 6. Development Flow

Стандартный процесс:

1. Product Owner формулирует идею
2. AI PM создаёт Epic
3. AI Developer делает PR
4. CI запускает тесты
5. AI QA делает review
6. Product Owner делает merge

---

# 7. Принципы

Основные принципы разработки:

### Small PR

Лучше 10 маленьких PR чем один большой.

### Safe changes

Не ломать существующие функции.

### Test coverage

Ключевые сценарии должны проверяться Playwright.

### Product first

Разработка должна ускорять развитие продукта.

---

# 8. Goal

Цель этой системы:

создать AI-команду разработки,
которая может быстро развивать продукт,
не ломая систему.