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
          .select({
            id: users.id,
            login: users.login,
            passwordHash: users.passwordHash,
            name: users.name,
            phone: users.phone,
            email: users.email,
            avatar: users.avatar,
            role: users.role,
          })
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
            avatar: u.avatar,
            role: u.role,
          });
      } catch (err) {
        req.log.error({ err, route: "/api/auth/login" });
        reply.internalServerError("Ошибка авторизации");
      }
    }
  );

  /**
   * === POST /api/auth/first-login/verify ===
   * Проверка токена первичной авторизации
   */
  app.post(
    "/first-login/verify",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { token } = req.body;

      try {
        const [u] = await db
          .select({
            id: users.id,
            login: users.login,
            name: users.name,
            firstLoginToken: users.firstLoginToken,
          })
          .from(users)
          .where(eq(users.firstLoginToken, token))
          .limit(1);

        if (!u) {
          return reply.code(404).send({ error: "not_found", message: "Invalid or expired token" });
        }

        return reply.send({
          id: u.id,
          login: u.login,
          name: u.name,
        });
      } catch (err) {
        req.log.error({ err, route: "/api/auth/first-login/verify" });
        reply.internalServerError("Ошибка проверки токена");
      }
    }
  );

  /**
   * === POST /api/auth/first-login/set-password ===
   * Установка пароля при первичной авторизации
   */
  app.post(
    "/first-login/set-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 6 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { token, password } = req.body;

      try {
        // Находим пользователя по токену
        const [u] = await db
          .select({
            id: users.id,
            login: users.login,
            name: users.name,
            phone: users.phone,
            email: users.email,
            avatar: users.avatar,
            role: users.role,
            firstLoginToken: users.firstLoginToken,
          })
          .from(users)
          .where(eq(users.firstLoginToken, token))
          .limit(1);

        if (!u) {
          return reply.code(404).send({ error: "not_found", message: "Invalid or expired token" });
        }

        // Хешируем новый пароль
        const passwordHash = await bcrypt.hash(password, 10);

        // Обновляем пароль и удаляем токен первичной авторизации
        await db
          .update(users)
          .set({
            passwordHash,
            firstLoginToken: null,
          })
          .where(eq(users.id, u.id));

        // Генерация JWT для автоматического входа
        const jwtToken = app.issueJwt({
          id: u.id,
          login: u.login,
          name: u.name,
          role: u.role,
        });

        // Устанавливаем cookie
        reply
          .setCookie("token", jwtToken, {
            ...app.cookieDefaults,
          })
          .send({
            id: u.id,
            login: u.login,
            name: u.name,
            phone: u.phone,
            email: u.email,
            avatar: u.avatar,
            role: u.role,
          });
      } catch (err) {
        req.log.error({ err, route: "/api/auth/first-login/set-password" });
        reply.internalServerError("Ошибка установки пароля");
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
        .select({
          id: users.id,
          login: users.login,
          name: users.name,
          phone: users.phone,
          email: users.email,
          avatar: users.avatar,
          role: users.role,
        })
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
        avatar: u.avatar,
        role: u.role,
      };
    } catch (err) {
      req.log.error({ err, route: "/api/auth/me" });
      reply.internalServerError("Ошибка получения профиля");
    }
  });
}