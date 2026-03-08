# Coding Rules — myLogistics

Эти правила обязательны для AI-агентов, работающих с кодом проекта.

---

# Общие правила

1. Изменять только те файлы, которые относятся к задаче.
2. Не делать массовых рефакторингов без явного запроса.
3. Не переименовывать файлы и директории без необходимости.
4. Не удалять существующий функционал без запроса.
5. Избегать больших изменений в одном Pull Request.

---

# Frontend правила

Используется стек:

React + Vite + Tailwind

Правила:

1. Сохранять текущую структуру компонентов.
2. Не ломать существующие страницы.
3. Использовать существующие UI компоненты, если они уже есть.
4. Новые компоненты размещать в соответствующих папках `/src/components`.

---

# Backend правила

Используется:

Node.js + Fastify + Drizzle ORM + PostgreSQL.

Правила:

1. Не ломать существующие API endpoints.
2. Новые поля базы данных добавлять только через migrations.
3. Не удалять поля базы без явного запроса.
4. Проверять, что новые изменения не ломают существующие маршруты.

---

# Database правила

1. Все изменения структуры БД должны идти через drizzle migrations.
2. Не редактировать старые migrations.
3. Новые migrations добавлять как отдельные файлы.

---


# Git правила

1. Делать небольшие и понятные коммиты.
2. Не изменять файлы, не относящиеся к задаче.
3. Pull Request должен содержать понятное описание изменений.

---

# Database Migration Safety Rules

When modifying the database schema (for example adding a new column to an existing table), the agent must follow the full migration lifecycle. Changing only `schema.js` is not enough.

The agent must ensure that schema, migrations and CI database are always synchronized.

## Required checklist when adding a new column

If a new column is added to an existing table, the agent MUST verify all of the following:

1. **schema.js**
   - The column is added to the Drizzle schema definition.

2. **Migration SQL**
   - A migration file exists in `/server/drizzle/`.
   - Example:
     ```sql
     ALTER TABLE users ADD COLUMN first_login_token TEXT;
     ```

3. **Migration registration**
   - The migration must be registered in:
     `server/drizzle/meta/_journal.json`
   - If the migration is missing from the journal, Drizzle may ignore it.

4. **CI migration path**
   - CI must execute migrations before any scripts that interact with the database.
   - Especially before scripts like:
     `scripts/seed-user.js`

5. **Seed scripts compatibility**
   - Check scripts in `server/scripts/`.
   - Ensure inserts do not reference columns that may not yet exist.

6. **ORM queries**
   - Verify that inserts/selects/updates referencing the table are compatible with the migration state.
   - Inspect:
     - routes
     - auth
     - users
     - seed scripts

## CI Failure Rule

If CI fails with an error like:

```
column "<column_name>" does not exist
```

The agent must:

1. Check the migration chain
2. Verify the migration file exists
3. Verify the migration is registered in `_journal.json`
4. Verify CI actually runs migrations before seed scripts
5. Fix the migration lifecycle instead of removing the feature

The agent must **never bypass CI** and must fix the root cause.

## Preview / Runtime Safety

Even if CI is green, the agent must ensure migrations are correctly applied in:

- preview environments
- staging environments

If runtime logs show schema drift (code expects a column but DB does not have it), the agent must repair the migration chain.

## Forbidden shortcuts

The agent must NOT:

- remove a new feature just to pass CI
- comment out schema fields
- bypass migrations
- ignore database drift

The correct fix is always to repair the migration lifecycle.

---

# Pull Request Description Rules

При создании Pull Request агент обязан заполнять описание PR.

PR description должен быть написан **на русском языке**.

Агент должен заполнить все разделы:

- Summary
- Что изменилось
- Зачем это нужно
- Как протестировать
- Риски
- Скриншоты (если UI)
- Checklist

Описание должно быть основано на:
- реализованном Spec
- фактических изменениях в коде
- acceptance criteria