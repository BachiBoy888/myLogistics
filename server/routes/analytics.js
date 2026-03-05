// server/routes/analytics.js
// API для аналитики - чтение из daily snapshots

import { z } from "zod";
import { sql } from "drizzle-orm";

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(["day", "week", "month"]),
});

const ALL_PL_STATUSES = [
  "draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
  "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"
];

const WEIGHT_STATUSES = ["awaiting_docs", "to_load", "released", "kg_customs"];

// Хелпер для безопасного получения rows из результата Drizzle
function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.rows) return result.rows;
  return [];
}

export default async function analyticsRoutes(app) {
  const db = app.drizzle;

  app.get("/", async (req, reply) => {
    try {
      const query = QuerySchema.parse(req.query);
      const { from, to, granularity } = query;

      req.log.info({ from, to, granularity }, "Analytics request");

      // Получаем мета-информацию о последнем snapshot
      const metaResult = await db.execute(sql`
        SELECT 
          MAX(day)::text as last_snapshot_day,
          MAX(generated_at)::text as generated_at,
          MAX(source_ts)::text as source_ts
        FROM analytics_daily_snapshots
        WHERE day <= ${to}::date
      `);

      const metaRows = getRows(metaResult);
      const metaRow = metaRows.length > 0 ? metaRows[0] : null;

      const meta = {
        from,
        to,
        granularity,
        lastSnapshotDay: metaRow?.last_snapshot_day || null,
        generatedAt: metaRow?.generated_at || null,
        sourceTs: metaRow?.source_ts || null,
      };

      // Получаем данные из snapshots
      const [clientDynamics, plByStatus, weightDynamics] = await Promise.all([
        getClientDynamics(db, from, to, granularity, req.log),
        getPLByStatus(db, from, to, granularity, req.log),
        getWeightDynamics(db, from, to, granularity, req.log),
      ]);

      return {
        meta,
        clientDynamics,
        plByStatus,
        weightDynamics,
      };
    } catch (err) {
      console.error("Analytics error:", err);
      return reply.status(500).send({ error: err.message });
    }
  });
}

// Генерация диапазона дат
function generateDateRange(from, to, granularity) {
  const dates = [];
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  let current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    
    if (granularity === "day") {
      current.setUTCDate(current.getUTCDate() + 1);
    } else if (granularity === "week") {
      current.setUTCDate(current.getUTCDate() + 7);
    } else if (granularity === "month") {
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }

  return dates;
}

// Динамика клиентов - читаем из snapshots
async function getClientDynamics(db, from, to, granularity, log) {
  const dateRange = generateDateRange(from, to, granularity);
  
  // Загружаем все snapshots за период
  const result = await db.execute(sql`
    SELECT 
      day::text as day,
      total_clients,
      inquiry_clients,
      active_clients
    FROM analytics_daily_snapshots
    WHERE day >= ${from}::date AND day <= ${to}::date
    ORDER BY day
  `);

  const rows = getRows(result);
  
  if (rows.length === 0) {
    log.warn({ from, to }, "No client snapshots found for period");
  }

  const snapshotMap = new Map(rows.map(r => [r.day, r]));

  return dateRange.map(date => {
    const snap = snapshotMap.get(date);
    return {
      date,
      total: snap?.total_clients ?? 0,
      inquiry: snap?.inquiry_clients ?? 0,
      active: snap?.active_clients ?? 0,
    };
  });
}

// PL по статусам - читаем из snapshots
async function getPLByStatus(db, from, to, granularity, log) {
  const dateRange = generateDateRange(from, to, granularity);
  
  // Загружаем все snapshots за период
  const result = await db.execute(sql`
    SELECT 
      day::text as day,
      status,
      pl_count
    FROM analytics_daily_pl_status
    WHERE day >= ${from}::date AND day <= ${to}::date
    ORDER BY day, status
  `);

  const rows = getRows(result);
  
  if (rows.length === 0) {
    log.warn({ from, to }, "No PL status snapshots found for period");
  }

  // Группируем по дате
  const dayStatusMap = new Map();
  for (const row of rows) {
    if (!dayStatusMap.has(row.day)) {
      dayStatusMap.set(row.day, new Map());
    }
    dayStatusMap.get(row.day).set(row.status, row.pl_count);
  }

  return dateRange.map(date => {
    const statusMap = dayStatusMap.get(date) || new Map();
    const result = { date };
    for (const status of ALL_PL_STATUSES) {
      result[status] = statusMap.get(status) ?? 0;
    }
    return result;
  });
}

// Динамика веса - читаем из snapshots
async function getWeightDynamics(db, from, to, granularity, log) {
  const dateRange = generateDateRange(from, to, granularity);
  
  // Загружаем все snapshots за период
  const result = await db.execute(sql`
    SELECT 
      day::text as day,
      status,
      total_weight
    FROM analytics_daily_weight_status
    WHERE day >= ${from}::date AND day <= ${to}::date
    ORDER BY day, status
  `);

  const rows = getRows(result);
  
  if (rows.length === 0) {
    log.warn({ from, to }, "No weight snapshots found for period");
  }

  // Группируем по дате
  const dayStatusMap = new Map();
  for (const row of rows) {
    if (!dayStatusMap.has(row.day)) {
      dayStatusMap.set(row.day, new Map());
    }
    dayStatusMap.get(row.day).set(row.status, Math.round(row.total_weight || 0));
  }

  return dateRange.map(date => {
    const statusMap = dayStatusMap.get(date) || new Map();
    const result = { date };
    for (const status of WEIGHT_STATUSES) {
      result[status] = statusMap.get(status) ?? 0;
    }
    return result;
  });
}
