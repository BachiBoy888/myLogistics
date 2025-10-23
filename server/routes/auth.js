// server/routes/auth.js
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import bcrypt from "bcryptjs";

export default async function authRoutes(app) {
  const db = app.drizzle;

  /**
   * === POST /api/auth/login ===
   * Авторизация пользователя и установка httpOnly cookie
   */
  app.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["login", "password"],
          properties: {
            login: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { login, password } = req.body;

      try {
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.login, login))
          .limit(1);

        if (!u) return reply.unauthorized("Неверный логин или пароль");

        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) return reply.unauthorized("Неверный логин или пароль");

        // Генерация JWT
        const token = app.issueJwt({
          id: u.id,
          login: u.login,
          name: u.name,
          role: u.role,
        });

        // Устанавливаем cookie с учётом окружения
        reply
          .setCookie("token", token, {
            ...app.cookieDefaults, // ← берём дефолты из server.js
          })
          .send({
            id: u.id,
            login: u.login,
            name: u.name,
            phone: u.phone,
            email: u.email,
          });
      } catch (err) {
        req.log.error({ err, route: "/api/auth/login" });
        reply.internalServerError("Ошибка авторизации");
      }
    }
  );

  /**
   * === POST /api/auth/logout ===
   * Сброс cookie
   */
  app.post("/logout", async (req, reply) => {
    reply.clearCookie("token", { path: "/" }).send({ ok: true });
  });

  /**
   * === GET /api/auth/me ===
   * Проверка текущего пользователя
   */
  app.get("/me", async (req, reply) => {
    if (!req.user) return reply.unauthorized("Неавторизован");

    try {
      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!u) return reply.unauthorized("Пользователь не найден");

      return {
        id: u.id,
        login: u.login,
        name: u.name,
        phone: u.phone,
        email: u.email,
      };
    } catch (err) {
      req.log.error({ err, route: "/api/auth/me" });
      reply.internalServerError("Ошибка получения профиля");
    }
  });
}