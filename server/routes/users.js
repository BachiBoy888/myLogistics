// server/routes/users.js
import { eq, sql } from "drizzle-orm";
import { users as usersTable } from "../db/schema.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
            phone: usersTable.phone,
            isActive: usersTable.isActive,
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
            phone: usersTable.phone,
            isActive: usersTable.isActive,
          })
          .from(usersTable);
      }

      const list = (rows || []).map((u) => ({
        id: u.id,
        name: u.name || u.login || "Пользователь",
        role: u.role || "",
        email: u.email || null,
        phone: u.phone || null,
        isActive: u.isActive === 'true' || u.isActive === true,
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
          avatar: usersTable.avatar,
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
        avatar: u.avatar,
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
          avatar: usersTable.avatar,
          role: usersTable.role,
        });

      return reply.send({
        id: updated.id,
        login: updated.login,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
      });
    } catch (err) {
      req.log.error({ err }, "PATCH /api/users/me failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to update profile" });
    }
  });

  // POST /api/users/me/avatar - загрузить аватар
  app.post("/me/avatar", async (req, reply) => {
    try {
      const file = await req.file();
      if (!file) {
        return reply.code(400).send({ error: "bad_request", message: "No file uploaded" });
      }

      // Проверяем тип файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return reply.code(400).send({ error: "bad_request", message: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" });
      }

      // Проверяем размер (макс 5MB)
      const buffer = await file.toBuffer();
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.code(400).send({ error: "bad_request", message: "File too large. Max 5MB" });
      }

      // Сохраняем как base64 data URL
      const base64 = buffer.toString('base64');
      const avatarUrl = `data:${file.mimetype};base64,${base64}`;

      const [updated] = await db
        .update(usersTable)
        .set({ avatar: avatarUrl })
        .where(eq(usersTable.id, req.user.id))
        .returning({
          id: usersTable.id,
          avatar: usersTable.avatar,
        });

      return reply.send({
        id: updated.id,
        avatar: updated.avatar,
      });
    } catch (err) {
      req.log.error({ err }, "POST /api/users/me/avatar failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to upload avatar" });
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

  // POST /api/users - создать нового пользователя (только для админов)
  app.post("/", async (req, reply) => {
    try {
      // Проверяем что запрашивает админ
      if (req.user.role !== 'admin') {
        return reply.code(403).send({ error: "forbidden", message: "Only admin can create users" });
      }

      const { login, name, password, role, phone, email } = req.body || {};

      if (!login || !name || !password) {
        return reply.code(400).send({ error: "bad_request", message: "login, name and password are required" });
      }

      if (password.length < 6) {
        return reply.code(400).send({ error: "bad_request", message: "Password must be at least 6 characters" });
      }

      // Проверяем что логин не занят
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.login, login))
        .limit(1);

      if (existing) {
        return reply.code(409).send({ error: "conflict", message: "Login already exists" });
      }

      // Генерируем токен для первичной авторизации
      const firstLoginToken = crypto.randomUUID();

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10);

      const [created] = await db
        .insert(usersTable)
        .values({
          login: String(login).trim(),
          name: String(name).trim(),
          passwordHash,
          role: role || 'user',
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim().toLowerCase() : null,
          firstLoginToken,
        })
        .returning({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          role: usersTable.role,
          phone: usersTable.phone,
          email: usersTable.email,
          firstLoginToken: usersTable.firstLoginToken,
        });

      return reply.code(201).send(created);
    } catch (err) {
      req.log.error({ err }, "POST /api/users failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to create user" });
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
          avatar: usersTable.avatar,
          role: usersTable.role,
          isActive: usersTable.isActive,
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
        avatar: u.avatar,
        role: u.role,
        isActive: u.isActive === 'true' || u.isActive === true,
        createdAt: u.createdAt,
      });
    } catch (err) {
      req.log.error({ err }, "GET /api/users/:id failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to get user" });
    }
  });

  // PATCH /api/users/:id - обновить пользователя (только для админов)
  app.patch("/:id", async (req, reply) => {
    try {
      // Проверяем что запрашивает админ
      if (req.user.role !== 'admin') {
        return reply.code(403).send({ error: "forbidden", message: "Only admin can update users" });
      }

      const targetId = req.params.id;
      const { name, role, phone, email, avatar } = req.body || {};

      const updateData = {};
      if (name !== undefined) updateData.name = String(name).trim();
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
      if (email !== undefined) updateData.email = email ? String(email).trim().toLowerCase() : null;
      if (avatar !== undefined) updateData.avatar = avatar || null;

      if (Object.keys(updateData).length === 0) {
        return reply.code(400).send({ error: "bad_request", message: "No fields to update" });
      }

      const [updated] = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, targetId))
        .returning({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          phone: usersTable.phone,
          email: usersTable.email,
          avatar: usersTable.avatar,
          role: usersTable.role,
          isActive: usersTable.isActive,
        });

      if (!updated) {
        return reply.code(404).send({ error: "not_found", message: "User not found" });
      }

      return reply.send({
        id: updated.id,
        login: updated.login,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
        isActive: updated.isActive === 'true' || updated.isActive === true,
      });
    } catch (err) {
      req.log.error({ err }, "PATCH /api/users/:id failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to update user" });
    }
  });

  // DELETE /api/users/:id - деактивировать пользователя (soft delete, только для админов)
  app.delete("/:id", async (req, reply) => {
    try {
      // Проверяем что запрашивает админ
      if (req.user.role !== 'admin') {
        return reply.code(403).send({ error: "forbidden", message: "Only admin can deactivate users" });
      }

      const targetId = req.params.id;

      // Нельзя деактивировать самого себя
      if (targetId === req.user.id) {
        return reply.code(400).send({ error: "bad_request", message: "Cannot deactivate yourself" });
      }

      const [updated] = await db
        .update(usersTable)
        .set({ isActive: 'false' })
        .where(eq(usersTable.id, targetId))
        .returning({
          id: usersTable.id,
          login: usersTable.login,
          name: usersTable.name,
          isActive: usersTable.isActive,
        });

      if (!updated) {
        return reply.code(404).send({ error: "not_found", message: "User not found" });
      }

      return reply.send({
        id: updated.id,
        login: updated.login,
        name: updated.name,
        isActive: updated.isActive === 'true' || updated.isActive === true,
        message: "User deactivated successfully",
      });
    } catch (err) {
      req.log.error({ err }, "DELETE /api/users/:id failed");
      return reply.code(500).send({ error: "internal_server_error", message: "Failed to deactivate user" });
    }
  });
}
