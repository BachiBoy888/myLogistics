// server/routes/analytics.js
// API для аналитических данных - оптимизированная версия

import { z } from "zod";
import { sql } from "drizzle-orm";

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(["day", "week", "month"]),
});

export default async function analyticsRoutes(app) {
  const db = app.drizzle;

  app.get("/", async (req, reply) => {
    try {
      const query = QuerySchema.parse(req.query);
      const { from, to, granularity } = query;

      req.log.info({ from, to, granularity }, "Analytics request");

      const [clientDynamics, plByStatus, weightDynamics] = await Promise.all([
        getClientDynamics(db, from, to, granularity),
        getPLByStatus(db, from, to, granularity),
        getWeightDynamics(db, from, to, granularity),
      ]);

      return { clientDynamics, plByStatus, weightDynamics };
    } catch (err) {
      console.error("Analytics error:", err);
      return reply.status(500).send({ error: err.message, stack: err.stack });
    }
  });
}

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

// Динамика клиентов
async function getClientDynamics(db, from, to, granularity) {
  const dateRange = generateDateRange(from, to, granularity);
  
  // Все клиенты за период
  const clientsResult = await db.execute(sql`
    SELECT 
      DATE(created_at) as created_date,
      COUNT(*)::int as count
    FROM clients
    WHERE created_at >= ${from + "T00:00:00Z"}
      AND created_at <= ${to + "T23:59:59.999Z"}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `);

  const totalMap = new Map(clientsResult.rows.map(r => [r.created_date, r.count]));
  
  return dateRange.map(date => ({
    date,
    total: totalMap.get(date) || 0,
    inquiry: 0,
    active: 0,
  }));
}

// PL по статусам
async function getPLByStatus(db, from, to, granularity) {
  const dateRange = generateDateRange(from, to, granularity);
  const allStatuses = [
    "draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
    "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"
  ];

  const plResult = await db.execute(sql`
    SELECT 
      DATE(created_at) as created_date,
      status,
      COUNT(*)::int as count
    FROM pl
    WHERE created_at >= ${from + "T00:00:00Z"}
      AND created_at <= ${to + "T23:59:59.999Z"}
    GROUP BY DATE(created_at), status
    ORDER BY DATE(created_at), status
  `);

  const dateStatusMap = new Map();
  for (const row of plResult.rows) {
    if (!dateStatusMap.has(row.created_date)) {
      dateStatusMap.set(row.created_date, new Map());
    }
    dateStatusMap.get(row.created_date).set(row.status, row.count);
  }

  return dateRange.map(date => {
    const row = { date };
    const statusMap = dateStatusMap.get(date) || new Map();
    for (const status of allStatuses) {
      row[status] = statusMap.get(status) || 0;
    }
    return row;
  });
}

// Динамика веса
async function getWeightDynamics(db, from, to, granularity) {
  const dateRange = generateDateRange(from, to, granularity);
  const keyStatuses = ["awaiting_docs", "to_load", "released", "kg_customs"];

  const weightResult = await db.execute(sql`
    SELECT 
      DATE(created_at) as created_date,
      status,
      COALESCE(SUM(weight), 0)::float as total_weight
    FROM pl
    WHERE created_at >= ${from + "T00:00:00Z"}
      AND created_at <= ${to + "T23:59:59.999Z"}
      AND status IN ('awaiting_docs', 'to_load', 'released', 'kg_customs')
    GROUP BY DATE(created_at), status
    ORDER BY DATE(created_at), status
  `);

  const dateStatusMap = new Map();
  for (const row of weightResult.rows) {
    if (!dateStatusMap.has(row.created_date)) {
      dateStatusMap.set(row.created_date, new Map());
    }
    dateStatusMap.get(row.created_date).set(row.status, Math.round(row.total_weight));
  }

  return dateRange.map(date => {
    const row = { date };
    const statusMap = dateStatusMap.get(date) || new Map();
    for (const status of keyStatuses) {
      row[status] = statusMap.get(status) || 0;
    }
    return row;
  });
}
