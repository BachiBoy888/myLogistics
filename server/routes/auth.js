// server/routes/auth.js
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import bcrypt from 'bcryptjs';

export default async function authRoutes(app) {
  const db = app.drizzle;

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['login', 'password'],
        properties: {
          login: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      }
    }
  }, async (req, reply) => {
    const { login, password } = req.body;
    const [u] = await db.select().from(users).where(eq(users.login, login)).limit(1);
    if (!u) return reply.unauthorized('Неверный логин или пароль');

    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return reply.unauthorized('Неверный логин или пароль');

    const token = app.issueJwt({ id: u.id, login: u.login, name: u.name });

    reply
      .setCookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: !!process.env.RENDER, // в проде включи secure
        maxAge: 60 * 60 * 24 * 30,    // 30 дней
      })
      .send({ id: u.id, login: u.login, name: u.name, phone: u.phone, email: u.email });
  });

  app.post('/logout', async (req, reply) => {
    reply
      .clearCookie('token', { path: '/' })
      .send({ ok: true });
  });

  app.get('/me', async (req, reply) => {
    if (!req.user) return reply.unauthorized();
    // подтянем свежие данные пользователя
    const [u] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!u) return reply.unauthorized();
    return { id: u.id, login: u.login, name: u.name, phone: u.phone, email: u.email };
  });
}