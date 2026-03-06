# Tech Context — myLogistics

Этот документ описывает техническую архитектуру проекта.

---

# Frontend

Стек:

- React
- Vite
- Tailwind CSS

Основной код фронтенда находится в:

/src

Основные директории:

/src/components  
/src/views  
/src/hooks  
/src/api  

---

# Backend

Стек:

- Node.js
- Fastify
- Drizzle ORM
- PostgreSQL

Backend код находится в:

/server

Основные директории:

/server/routes  
/server/db  
/server/services  
/server/scripts  

---

# Database

База данных:

PostgreSQL

ORM:

Drizzle ORM

Миграции находятся в:

/server/drizzle

Миграции применяются автоматически при деплое.

---

# Deploy

Deploy происходит через Render.

Окружения:

- production
- stage
- preview

Preview deployment автоматически создаётся для каждого Pull Request.

---

# CI / GitHub

Репозиторий находится в GitHub.

Процесс разработки:

1. создаётся новая ветка
2. изменения коммитятся
3. создаётся Pull Request
4. CI проверяет сборку
5. Render создаёт preview deployment
