// server/server.js
import Fastify from 'fastify';
import 'dotenv/config';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';            // ← NEW
import jwtLib from 'jsonwebtoken';               // ← NEW

import path from 'path';
import { fileURLToPath } from 'url';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { getUploadsRootAbs } from './services/storage.js';
import clientsRoutes from './routes/clients.js';
import plRoutes from './routes/pl.js';
import consolidationsRoutes from './routes/consolidations.js';
import authRoutes from './routes/auth.js';       // ← NEW

// --- вычислим текущую папку (для статики)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- конфиг
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL;

// --- старт
async function start() {
  const app = Fastify({ logger: true });

  // БД: postgres-js + drizzle и прокинем в fastify instance
  const sql = postgres(DATABASE_URL, { prepare: true, idle_timeout: 20 });
  const db = drizzle(sql);
  app.decorate('drizzle', db);

  // Плагины
  await app.register(sensible);

  // Для монолита CORS не обязателен. Можно оставить, но безопаснее выключить.
  // Если будешь выносить фронт на другой домен — раскомментируй и настрой origin:
  // await app.register(cors, { origin: true, credentials: true });

  // Не ломаем превью файлов/страниц в <iframe>
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });

  // multipart без attachFieldsToBody — нужны filename/mimetype
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  // Cookies (для httpOnly JWT cookie)
  await app.register(cookie, {
    secret: process.env.JWT_SECRET || 'dev-secret',
  });

  // === JWT helpers & auth guard ===
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

  // user на запрос
  app.decorateRequest('user', null);

  // Попытка прочитать токен из cookie и верифицировать
  app.addHook('preHandler', async (req, _reply) => {
    const token = req.cookies?.token;
    if (!token) return;
    try {
      const payload = jwtLib.verify(token, JWT_SECRET);
      // payload: { id, login, name, role?, iat, exp }
      req.user = payload;
    } catch {
      // невалидный/протухший токен — молча игнорируем
    }
  });

  // Метод для выдачи JWT
  app.decorate('issueJwt', (user) => {
    // user: { id, login, name, role? }
    return jwtLib.sign(
      { id: user.id, login: user.login, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
  });

  // Guard для закрытых эндпоинтов
  app.decorate('authGuard', async (req, reply) => {
    if (!req.user) return reply.unauthorized('Unauthorized');
  });

  // Раздача /uploads (постоянное хранилище)
  await app.register(fastifyStatic, {
    root: getUploadsRootAbs(),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Раздача собранного фронта (Vite -> dist) с корня
  const distRoot = path.resolve(__dirname, '../dist');
  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: '/', // фронт доступен с корня
    decorateReply: false,
  });

  // Health / ping
  app.get('/ping', async () => ({ message: 'pong' }));
  app.get('/healthz', async () => ({ ok: true }));

  // Маршруты API (важно: не конфликтуют с фронтом)
  await app.register(authRoutes, { prefix: '/api/auth' });                   // ← NEW: /api/auth/...
  await app.register(clientsRoutes, { prefix: '/api' });                     // /api/clients...
  await app.register(plRoutes, { prefix: '/api/pl' });                       // /api/pl/...
  await app.register(consolidationsRoutes, { prefix: '/api/consolidations' });// /api/consolidations/...

  // SPA fallback: всё не-API отдаём index.html
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url.startsWith('/api')) return reply.notFound();
    return reply.sendFile('index.html'); // из distRoot
  });

  // Глобальный обработчик ошибок
  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        tag: 'UNHANDLED_ERROR',
        route: request.url,
        method: request.method,
        params: request.params,
        body: request.body,
        query: request.query,
        code: error.code,
        message: error.message,
        detail: error.detail,
        cause: error.cause,
        stack: error.stack,
      },
      '💥 Unhandled server error',
    );

    reply.code(500).send({
      error: 'internal_server_error',
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
  });

  // Запуск
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`✅ Server on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const close = async () => {
    try {
      await app.close();
      await sql.end({ timeout: 5 });
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

start();