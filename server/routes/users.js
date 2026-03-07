// server/routes/users.js
import { eq, sql } from "drizzle-orm";
import { users as usersTable } from "../db/schema.js";
import bcrypt from "bcryptjs";

/** Fastify plugin */
export default async function usersRoutes(app) {
  const db = app.drizzle;

  // защита: только авторизованные
  app.addHook("preHandler", app.authGuard);

  // GET /api/users?role=logist
  app.get("/", async (req, reply) => {
    try {
      const role = String(req.query?.role ?? "").trim();

      let rows;
      if (role) {
        rows = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            role: usersTable.role,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(eq(usersTable.role, role));
      } else {
        rows = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            role: usersTable.role,
            email: usersTable.email,
          })
          .from(usersTable);
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

  // GET /api/users/me - получить текущего пользователя (расширенные данные)
  app.get("/me", async (req, reply) => {
    try {
      const [u] = await db
        .select({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          phone: usersTable.phone,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1);

      if (!u) {
        return reply.code(404).send({ error: "not_found", message: "User not found" });
      }

      return reply.send({
        id: u.id,
        login: u.login,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      });
    } catch (err) {
      req.log.error({ err }, "GET /api/users/me failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to get user" });
    }
  });

  // PATCH /api/users/me - обновить профиль текущего пользователя
  app.patch("/me", async (req, reply) => {
    try {
      const { name, phone, email } = req.body || {};
      
      const updateData = {};
      if (name !== undefined) updateData.name = String(name).trim();
      if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
      if (email !== undefined) updateData.email = email ? String(email).trim().toLowerCase() : null;

      if (Object.keys(updateData).length === 0) {
        return reply.code(400).send({ error: "bad_request", message: "No fields to update" });
      }

      const [updated] = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, req.user.id))
        .returning({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          phone: usersTable.phone,
          email: usersTable.email,
          role: usersTable.role,
        });

      return reply.send({
        id: updated.id,
        login: updated.login,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        role: updated.role,
      });
    } catch (err) {
      req.log.error({ err }, "PATCH /api/users/me failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to update profile" });
    }
  });

  // POST /api/users/me/password - сменить пароль
  app.post("/me/password", async (req, reply) => {
    try {
      const { oldPassword, newPassword } = req.body || {};

      if (!oldPassword || !newPassword) {
        return reply.code(400).send({ error: "bad_request", message: "Old and new password required" });
      }

      if (newPassword.length < 6) {
        return reply.code(400).send({ error: "bad_request", message: "New password must be at least 6 characters" });
      }

      // Получаем текущего пользователя с хешем пароля
      const [u] = await db
        .select({
          id: usersTable.id,
          passwordHash: usersTable.passwordHash,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1);

      if (!u) {
        return reply.code(404).send({ error: "not_found", message: "User not found" });
      }

      // Проверяем старый пароль
      const isValid = await bcrypt.compare(oldPassword, u.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: "unauthorized", message: "Old password is incorrect" });
      }

      // Хешируем новый пароль
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db
        .update(usersTable)
        .set({ passwordHash: newPasswordHash })
        .where(eq(usersTable.id, req.user.id));

      return reply.send({ ok: true, message: "Password changed successfully" });
    } catch (err) {
      req.log.error({ err }, "POST /api/users/me/password failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to change password" });
    }
  });

  // GET /api/users/:id - получить пользователя по ID (только для админов)
  app.get("/:id", async (req, reply) => {
    try {
      // Проверяем что запрашивает сам себя или админ
      const targetId = req.params.id;
      if (targetId !== req.user.id && req.user.role !== 'admin') {
        return reply.code(403).send({ error: "forbidden", message: "Access denied" });
      }

      const [u] = await db
        .select({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          phone: usersTable.phone,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, targetId))
        .limit(1);

      if (!u) {
        return reply.code(404).send({ error: "not_found", message: "User not found" });
      }

      return reply.send({
        id: u.id,
        login: u.login,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      });
    } catch (err) {
      req.log.error({ err }, "GET /api/users/:id failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to get user" });
    }
  });
}
