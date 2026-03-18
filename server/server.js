// server/server.js
import "./bootstrap/env.js"; // ← грузим .env.* ДО использования process.env

import Fastify from "fastify";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import jwtLib from "jsonwebtoken";

import path from "path";
import { fileURLToPath } from "url";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { getUploadsRootAbs } from "./services/storage.js";
import clientsRoutes from "./routes/clients.js";
import plRoutes from "./routes/pl.js";
import consolidationsRoutes from "./routes/consolidations.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import healthRoutes from "./routes/health.js";
import analyticsRoutes from "./routes/analytics.js";
import fxRoutes from "./routes/fx.js";
import importRoutes from "./routes/import.js";
import leadsRoutes from "./routes/leads.js";

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
  const isLocalDb =
  DATABASE_URL?.includes("localhost") ||
  DATABASE_URL?.includes("127.0.0.1");

const sql = postgres(DATABASE_URL, {
  prepare: true,
  idle_timeout: 20,
  ...(isLocalDb ? {} : { ssl: "require" }),
});
  const db = drizzle(sql);
  app.decorate("drizzle", db);

  // Автоматический запуск миграций в production/preview
  if (IS_PROD) {
    try {
      const migrationsPath = path.join(__dirname, "drizzle");
      await migrate(db, { migrationsFolder: migrationsPath });
      console.log("✅ Database migrations applied");
    } catch (err) {
      console.error("❌ Migration failed:", err.message);
    }
  }

  // Runtime schema fix: ensure avatar column exists (handles drift between migration state and actual DB)
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`;
    console.log("✅ Runtime schema check passed");
  } catch (err) {
    console.error("❌ Runtime schema fix failed:", err.message);
  }

  // Плагины
  await app.register(sensible);

  // ✅ CORS: Environment-based allowlist for security
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Default fallback origins for development
  const DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  const allowedOrigins =
    ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return cb(null, true);

      // Check if origin is in allowlist
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      // Log blocked origin for debugging
      app.log.warn(
        { origin, allowedOrigins },
        "CORS blocked request from disallowed origin"
      );
      return cb(new Error("CORS: Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Source",
    ],
    exposedHeaders: [],
    maxAge: 86400,
  });

  // ✅ Rate limiting for public endpoints
  await app.register(rateLimit, {
    max: 100, // default limit
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip,
    skipOnError: true, // Don't block requests if rate limiter fails
    skip: (req) => {
      // Skip rate limiting for static assets
      const url = req.raw.url || "";
      const isStatic = url.startsWith("/assets/") || 
                       url.startsWith("/uploads/") || 
                       url.endsWith(".js") || 
                       url.endsWith(".css") || 
                       url.endsWith(".png") || 
                       url.endsWith(".jpg") ||
                       url === "/favicon.ico";
      if (isStatic) {
        console.log(`[RATE LIMIT SKIP] ${url}`);
      }
      return isStatic;
    },
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}`,
      retryAfter: context.after,
    }),
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
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
  console.log(`[STATIC] Configuring uploads root: ${getUploadsRootAbs()}`);
  await app.register(fastifyStatic, {
    root: getUploadsRootAbs(),
    prefix: "/uploads/",
    decorateReply: false,
  });

  const distRoot = path.resolve(__dirname, "../dist");
  console.log(`[STATIC] Configuring dist root: ${distRoot}`);
  
  // Check if dist folder exists
  const fs = await import("fs");
  const distExists = fs.existsSync(distRoot);
  console.log(`[STATIC] Dist folder exists: ${distExists}`);
  
  if (!distExists) {
    console.error(`[STATIC] ❌ CRITICAL: Dist folder not found at ${distRoot}`);
    console.error(`[STATIC] Current __dirname: ${__dirname}`);
    console.error(`[STATIC] Process cwd: ${process.cwd()}`);
    try {
      const parentDir = path.resolve(__dirname, "..");
      const parentFiles = fs.readdirSync(parentDir);
      console.error(`[STATIC] Parent directory contents: ${parentFiles.join(", ")}`);
    } catch (e) {
      console.error(`[STATIC] Error reading parent dir: ${e.message}`);
    }
  }
  
  if (distExists) {
    try {
      const files = fs.readdirSync(distRoot);
      console.log(`[STATIC] Dist folder contents: ${files.join(", ")}`);
      const assetsPath = path.join(distRoot, "assets");
      if (fs.existsSync(assetsPath)) {
        const assets = fs.readdirSync(assetsPath);
        console.log(`[STATIC] Assets folder contents (${assets.length} files)`);
      } else {
        console.error(`[STATIC] ❌ Assets folder not found at ${assetsPath}`);
      }
    } catch (err) {
      console.error(`[STATIC] Error reading dist: ${err.message}`);
    }
  }
  
  // Explicit static serving for /assets with error handling
  app.get("/assets/*", async (req, reply) => {
    const assetPath = req.params["*"];
    const fullPath = path.join(distRoot, "assets", assetPath);
    
    console.log(`[ASSETS] Request: ${assetPath}`);
    console.log(`[ASSETS] Looking at: ${fullPath}`);
    
    try {
      // Security: ensure we don't serve files outside assets folder
      const assetsRoot = path.join(distRoot, "assets");
      if (!fullPath.startsWith(assetsRoot)) {
        console.log(`[ASSETS] 403: Path traversal attempt`);
        return reply.status(403).send({ error: "Invalid path" });
      }

      if (!fs.existsSync(fullPath)) {
        console.log(`[ASSETS] 404: File not found`);
        return reply.status(404).send({ error: "Asset not found", path: assetPath });
      }

      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) {
        return reply.status(403).send({ error: "Not a file" });
      }

      // Set content type based on extension
      const ext = path.extname(fullPath);
      const contentTypes = {
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
      };

      const contentType = contentTypes[ext] || "application/octet-stream";
      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");

      console.log(`[ASSETS] 200: Serving ${assetPath} (${contentType})`);
      return reply.send(fs.createReadStream(fullPath));
    } catch (err) {
      console.error(`[ASSETS] 500 Error serving ${assetPath}:`, err.message);
      return reply.status(500).send({ error: "Failed to serve asset", message: err.message });
    }
  });
  
  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: "/",
    decorateReply: true,
  });

  // Health
  app.get("/ping", async () => ({ message: "pong" }));
  app.get("/healthz", async () => ({ ok: true }));

  // API
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(analyticsRoutes, { prefix: "/api/analytics" });
  await app.register(fxRoutes, { prefix: "/api/fx" });
  await app.register(importRoutes, { prefix: "/api/import" });
  await app.register(clientsRoutes, { prefix: "/api" });
  await app.register(plRoutes, { prefix: "/api/pl" });
  await app.register(consolidationsRoutes, { prefix: "/api/consolidations" });
  await app.register(usersRoutes, { prefix: "/api/users" });
  await app.register(leadsRoutes, { prefix: "/api" });

  // SPA fallback - serve index.html for all non-API, non-static routes
  app.setNotFoundHandler((req, reply) => {
    // API routes should return 404
    if (req.raw.url?.startsWith("/api")) return reply.notFound();
    // Static files that don't exist should return 404
    if (req.raw.url?.startsWith("/uploads/")) return reply.notFound();
    // Favicon
    if (req.raw.url === "/favicon.ico") return reply.notFound();
    // For everything else, serve index.html (SPA routing)
    if (typeof reply.sendFile === "function") {
      return reply.sendFile("index.html");
    }
    return reply.notFound();
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