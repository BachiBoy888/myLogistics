// server/routes/clients.js
import { eq, sql, count } from "drizzle-orm";
import { clients as clientsTable, pl as plTable } from "../db/schema.js";

/**
 * Fastify-плагин с роутами для клиентов.
 * Регистрируется в server.js: app.register(clientsRoutes, { prefix: "/api" })
 */

// простая нормализация имени
function normalizeName(str = "") {
  return String(str || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export default async function clientsRoutes(app) {
  const db = app.drizzle;

  // === 🔍 Поиск клиентов по имени (умный поиск) ===
  app.get("/clients/search", async (req, reply) => {
    const q = String(req.query.q || "").trim();
    if (!q) return [];

    // используем lower(unaccent(q)) и similarity()
    const normalized = q.toLowerCase();

    // limit можно регулировать
    const rows = await db.execute(sql`
      SELECT id, name, company, phone, email,
             similarity(normalized_name, lower(unaccent(${normalized}))) AS sim
      FROM clients
      WHERE normalized_name % lower(unaccent(${normalized}))
      ORDER BY sim DESC
      LIMIT 15
    `);

    return rows ?? [];
  });

  // === Список клиентов (всё) ===
  app.get("/clients", async () => {
    const rows = await db.select().from(clientsTable);
    // rows.sort((a,b)=> (a.name||"").localeCompare(b.name||"", "ru"));
    return rows;
  });

  // === Создание клиента ===
  app.post("/clients", { preHandler: app.authGuard }, async (req, reply) => {
    const {
      name,
      company = null,
      phone = null,
      phone2 = null,
      email = null,
      notes = null,
    } = req.body || {};

    if (!name || String(name).trim() === "") {
      return reply.badRequest("Поле name обязательно");
    }

    const [row] = await db
      .insert(clientsTable)
      .values({
        name: String(name).trim(),
        company,
        phone,
        phone2,
        email,
        notes,
        normalizedName: normalizeName(name),
      })
      .returning();

    return row;
  });

  // === Частичное обновление клиента ===
  app.patch("/clients/:id", { preHandler: app.authGuard }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.badRequest("Некорректный id");

    const payload = req.body || {};
    const allowed = ["name", "company", "phone", "phone2", "email", "notes"];
    const patch = {};

    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        patch[k] = payload[k];
      }
    }

    if (Object.keys(patch).length === 0) {
      return reply.badRequest("Пустой патч");
    }

    if (typeof patch.name === "string") {
      patch.normalizedName = normalizeName(patch.name);
    }

    const [row] = await db
      .update(clientsTable)
      .set(patch)
      .where(eq(clientsTable.id, id))
      .returning();

    if (!row) return reply.notFound("Клиент не найден");
    return row;
  });

  // === Удаление клиента (только если нет PL) ===
  app.delete("/clients/:id", { preHandler: app.authGuard }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.badRequest("Некорректный id");

    // 1. Проверяем существование клиента
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id));

    if (!client) {
      return reply.notFound("Клиент не найден");
    }

    // 2. Проверяем наличие PL у клиента
    const plCheck = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM pl WHERE client_id = ${id}
    `);
    const plCount = plCheck?.rows?.[0]?.count ?? 0;

    if (plCount > 0) {
      return reply.status(409).send({
        error: "CLIENT_HAS_PLS",
        message: "Нельзя удалить клиента: у него есть PL. Сначала удалите/перенесите PL на другого клиента."
      });
    }

    // 3. Удаляем клиента
    await db.delete(clientsTable).where(eq(clientsTable.id, id));

    return reply.status(204).send();
  });
}