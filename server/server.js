// server/server.js
import "./bootstrap/env.js"; // ← грузим .env.* ДО использования process.env

import Fastify from "fastify";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cookie from "@fastify/cookie";
import jwtLib from "jsonwebtoken";

import path from "path";
import { fileURLToPath } from "url";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { getUploadsRootAbs } from "./services/storage.js";
import clientsRoutes from "./routes/clients.js";
import plRoutes from "./routes/pl.js";
import consolidationsRoutes from "./routes/consolidations.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";

// --- вычислим текущую папку (для статики)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- конфиг
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD = process.env.NODE_ENV === "production" || process.env.RENDER === "1";


// ранняя проверка обязательных переменных
if (!DATABASE_URL) {
  console.error("✖ DATABASE_URL не задан. Проверь переменные окружения (.env.* / Render).");
  process.exit(1);
}

// --- старт
async function start() {
  const app = Fastify({
    logger: true,
    ajv: { customOptions: { strict: false, allowUnionTypes: true } },
    trustProxy: true,
  });

  // БД
  const sql = postgres(DATABASE_URL, { prepare: true, idle_timeout: 20 });
  const db = drizzle(sql);
  app.decorate("drizzle", db);

  // Плагины
  await app.register(sensible);

  // ✅ CORS: ЯВНО разрешаем методы/заголовки, чтобы прошёл preflight для PUT/PATCH/DELETE
  await app.register(cors, {
    origin: (origin, cb) => cb(null, true), // можно сузить до ['http://localhost:5173', ...]
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    exposedHeaders: [],
    maxAge: 86400
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  });

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  await app.register(cookie, {
    secret: process.env.JWT_SECRET || "dev-secret",
  });


  
  // === JWT helpers & auth guard ===
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
  const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";

  app.decorateRequest("user", null);
  app.decorate("isProd", IS_PROD);
  app.decorate("cookieDefaults", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  app.addHook("preHandler", async (req, _reply) => {
    const token = req.cookies?.token;
    if (!token) return;
    try {
      const payload = jwtLib.verify(token, JWT_SECRET);
      req.user = payload;
    } catch {}
  });

  app.decorate("issueJwt", (user) =>
    jwtLib.sign(
      { id: user.id, login: user.login, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )
  );

  app.decorate("authGuard", async (req, reply) => {
    if (!req.user) return reply.unauthorized("Unauthorized");
  });

  // Статика
  await app.register(fastifyStatic, {
    root: getUploadsRootAbs(),
    prefix: "/uploads/",
    decorateReply: false,
  });

  const distRoot = path.resolve(__dirname, "../dist");
  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: "/",
    decorateReply: false,
  });

  // Health
  app.get("/ping", async () => ({ message: "pong" }));
  app.get("/healthz", async () => ({ ok: true }));

  // API
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(clientsRoutes, { prefix: "/api" });
  await app.register(plRoutes, { prefix: "/api/pl" });
  await app.register(consolidationsRoutes, { prefix: "/api/consolidations" });
  await app.register(usersRoutes, { prefix: "/api/users" });

  // SPA fallback
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api")) return reply.notFound();
    return reply.sendFile("index.html");
  });

  
  // Errors
  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        tag: "UNHANDLED_ERROR",
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
      "💥 Unhandled server error"
    );
    reply.code(500).send({
      error: "internal_server_error",
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
    } catch {
      process.exit(1);
    }
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

start();