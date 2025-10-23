// server/routes/users.js
import { eq } from "drizzle-orm";
import { users as usersTable } from "../db/schema.js";

/** Fastify plugin */
export default async function usersRoutes(app) {
  // защита: только авторизованные
  app.addHook("preHandler", app.authGuard);

  // GET /api/users?role=logist
  app.get("/", async (req, reply) => {
    try {
      const role = String(req.query?.role ?? "").trim();

      let rows;
      if (role) {
        rows = await app.drizzle
          .select()
          .from(usersTable)
          .where(eq(usersTable.role, role));
      } else {
        rows = await app.drizzle.select().from(usersTable);
      }

      const list = (rows || []).map((u) => ({
        id: u.id,
        name: u.name || u.login || "Пользователь",
        role: u.role || "",
        email: u.email || null,
      }));

      return reply.send(list);
    } catch (err) {
      req.log.error({ err }, "GET /api/users failed");
      return reply
        .code(500)
        .send({ error: "internal_server_error", message: "Users query failed" });
    }
  });
}