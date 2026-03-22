import { sql } from "drizzle-orm";

/**
 * Admin API для staging окружения
 * Ограниченный operational access без raw SQL
 * 
 * Требования:
 * - ENABLE_ADMIN_API=true (env)
 * - ADMIN_API_TOKEN=<secret> (env)
 * - Bearer token auth
 * - Audit logging
 */

const ADMIN_OPS_LOG = []; // In-memory audit log (staging only)
const MAX_LOG_SIZE = 1000;

function auditLog(req, operation, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    operation,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    details,
  };
  ADMIN_OPS_LOG.push(entry);
  if (ADMIN_OPS_LOG.length > MAX_LOG_SIZE) {
    ADMIN_OPS_LOG.shift();
  }
  console.log("[ADMIN_AUDIT]", JSON.stringify(entry));
}

function verifyAdminToken(req, reply) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const expectedToken = process.env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    return reply.code(500).send({
      error: "ADMIN_TOKEN_NOT_CONFIGURED",
      message: "ADMIN_API_TOKEN env var is not set",
    });
  }

  if (!token || token !== expectedToken) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Invalid or missing Bearer token",
    });
  }
}

export default async function adminRoutes(app) {
  const ENABLE_ADMIN_API = process.env.ENABLE_ADMIN_API === "true";
  const IS_PROD = process.env.NODE_ENV === "production" || process.env.RENDER === "1";

  // Admin API отключен по умолчанию и в production
  // Используем .all() чтобы перехватывать ВСЕ методы (GET, POST, etc.)
  if (!ENABLE_ADMIN_API) {
    app.all("/*", async (req, reply) => {
      return reply.code(404).send({
        error: "ADMIN_API_DISABLED",
        message: "Admin API is not enabled",
      });
    });
    return;
  }

  // Дополнительная защита: не включать в production даже с env
  if (IS_PROD && !process.env.FORCE_ADMIN_API_IN_PROD) {
    app.all("/*", async (req, reply) => {
      return reply.code(403).send({
        error: "ADMIN_API_FORBIDDEN_IN_PROD",
        message: "Admin API is not available in production environment",
      });
    });
    return;
  }

  const db = app.drizzle;

  // ========== HEALTH ==========
  app.get("/health", async (req, reply) => {
    const check = await verifyAdminToken(req, reply);
    if (check) return check;

    auditLog(req, "health-check");

    return {
      status: "ok",
      environment: IS_PROD ? "production" : "staging",
      adminApiEnabled: true,
      timestamp: new Date().toISOString(),
    };
  });

  // ========== CHECK LEADS UTM COLUMNS ==========
  app.get("/check-leads-utm-columns", async (req, reply) => {
    const check = await verifyAdminToken(req, reply);
    if (check) return check;

    auditLog(req, "check-leads-utm-columns");

    try {
      // Проверяем существование колонок через information_schema
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name IN ('lead_entry_point', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content')
        ORDER BY column_name
      `);

      const existingColumns = result.map((r) => r.column_name);
      const expectedColumns = ['lead_entry_point', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
      const missingColumns = expectedColumns.filter((c) => !existingColumns.includes(c));

      return {
        table: "leads",
        expectedColumns,
        existingColumns,
        missingColumns,
        isComplete: missingColumns.length === 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      auditLog(req, "check-leads-utm-columns-error", { error: err.message });
      return reply.code(500).send({
        error: "CHECK_FAILED",
        message: err.message,
      });
    }
  });

  // ========== APPLY LEADS UTM COLUMNS ==========
  app.post("/apply-leads-utm-columns", async (req, reply) => {
    const check = await verifyAdminToken(req, reply);
    if (check) return check;

    auditLog(req, "apply-leads-utm-columns");

    try {
      // Проверяем текущее состояние
      const checkResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name IN ('lead_entry_point', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content')
      `);
      const existingColumns = checkResult.map((r) => r.column_name);

      const columnsToAdd = [];
      if (!existingColumns.includes("lead_entry_point")) {
        columnsToAdd.push(sql`ADD COLUMN IF NOT EXISTS lead_entry_point TEXT`);
      }
      if (!existingColumns.includes("utm_source")) {
        columnsToAdd.push(sql`ADD COLUMN IF NOT EXISTS utm_source TEXT`);
      }
      if (!existingColumns.includes("utm_medium")) {
        columnsToAdd.push(sql`ADD COLUMN IF NOT EXISTS utm_medium TEXT`);
      }
      if (!existingColumns.includes("utm_campaign")) {
        columnsToAdd.push(sql`ADD COLUMN IF NOT EXISTS utm_campaign TEXT`);
      }
      if (!existingColumns.includes("utm_content")) {
        columnsToAdd.push(sql`ADD COLUMN IF NOT EXISTS utm_content TEXT`);
      }

      if (columnsToAdd.length === 0) {
        return {
          applied: false,
          message: "All UTM columns already exist",
          columnsAdded: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Безопасное добавление колонок
      await db.execute(sql`ALTER TABLE leads ${sql.join(columnsToAdd, sql`, `)}`);

      // Создаем индексы (idempotent)
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leads_lead_entry_point ON leads(lead_entry_point)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source)`);

      auditLog(req, "apply-leads-utm-columns-success", { columnsAdded: columnsToAdd.length });

      return {
        applied: true,
        message: `Added ${columnsToAdd.length} column(s)`,
        columnsAdded: columnsToAdd.length,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      auditLog(req, "apply-leads-utm-columns-error", { error: err.message });
      return reply.code(500).send({
        error: "APPLY_FAILED",
        message: err.message,
      });
    }
  });

  // ========== MIGRATION STATUS ==========
  app.get("/migration-status", async (req, reply) => {
    const check = await verifyAdminToken(req, reply);
    if (check) return check;

    auditLog(req, "migration-status");

    try {
      // Проверяем drizzle migrations
      const drizzleMigrations = await db.execute(sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 10
      `).catch(() => []);

      // Проверяем наличие таблицы leads
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'leads'
        ) as exists
      `);

      // Схема таблицы leads
      const leadColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'leads'
        ORDER BY ordinal_position
      `);

      return {
        drizzleMigrations: drizzleMigrations.map((m) => ({
          id: m.id,
          hash: m.hash,
          createdAt: m.created_at,
        })),
        tables: {
          leads: {
            exists: tableExists[0]?.exists === true,
            columns: leadColumns.map((c) => ({
              name: c.column_name,
              type: c.data_type,
              nullable: c.is_nullable === "YES",
            })),
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      auditLog(req, "migration-status-error", { error: err.message });
      return reply.code(500).send({
        error: "STATUS_CHECK_FAILED",
        message: err.message,
      });
    }
  });

  // ========== AUDIT LOG ==========
  app.get("/audit-log", async (req, reply) => {
    const check = await verifyAdminToken(req, reply);
    if (check) return check;

    const { limit = 50 } = req.query;
    const logs = ADMIN_OPS_LOG.slice(-Number(limit)).reverse();

    return {
      logs,
      total: ADMIN_OPS_LOG.length,
    };
  });
}
