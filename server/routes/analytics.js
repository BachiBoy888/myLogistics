// server/routes/analytics.js
// API для аналитических данных

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

      const dateRange = generateDateRange(from, to, granularity);
      
      req.log.info({ dateRange }, "Analytics request");

      const [clientDynamics, plByStatus, weightDynamics] = await Promise.all([
        getClientDynamics(db, dateRange, req.log),
        getPLByStatus(db, dateRange, req.log),
        getWeightDynamics(db, dateRange, req.log),
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

async function getClientDynamics(db, dateRange, log) {
  const result = [];

  for (const date of dateRange) {
    try {
      const endDateStr = date + "T23:59:59.999Z";

      // Всего клиентов
      const totalResult = await db.execute(
        sql`SELECT COUNT(*)::int as count FROM clients WHERE created_at <= ${endDateStr}`
      );

      // Клиенты в статусе обращения (есть PL в статусе draft)
      const inquiryResult = await db.execute(sql`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM clients c
        INNER JOIN pl ON pl.client_id = c.id
        WHERE c.created_at <= ${endDateStr}
        AND pl.status = 'draft'
      `);

      // Активные клиенты
      const activeResult = await db.execute(sql`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM clients c
        INNER JOIN pl ON pl.client_id = c.id
        WHERE c.created_at <= ${endDateStr}
        AND pl.status NOT IN ('draft', 'closed', 'cancelled')
      `);

      result.push({
        date,
        total: totalResult?.rows?.[0]?.count || 0,
        inquiry: inquiryResult?.rows?.[0]?.count || 0,
        active: activeResult?.rows?.[0]?.count || 0,
      });
    } catch (err) {
      log.error({ date, err: err.message }, "Client dynamics error");
      result.push({ date, total: 0, inquiry: 0, active: 0 });
    }
  }

  return result;
}

async function getPLByStatus(db, dateRange, log) {
  const result = [];
  const allStatuses = [
    "draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
    "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"
  ];

  for (const date of dateRange) {
    try {
      const endDateStr = date + "T23:59:59.999Z";
      const row = { date };

      for (const status of allStatuses) {
        try {
          const countResult = await db.execute(sql`
            SELECT COUNT(*)::int as count 
            FROM pl 
            WHERE created_at <= ${endDateStr} AND status = ${status}
          `);
          
          row[status] = countResult?.rows?.[0]?.count || 0;
        } catch (statusErr) {
          row[status] = 0;
        }
      }

      result.push(row);
    } catch (err) {
      log.error({ date, err: err.message }, "PL by status error");
      result.push({ date });
    }
  }

  return result;
}

async function getWeightDynamics(db, dateRange, log) {
  const result = [];
  const keyStatuses = ["awaiting_docs", "to_load", "released", "kg_customs"];

  for (const date of dateRange) {
    try {
      const endDateStr = date + "T23:59:59.999Z";
      const row = { date };

      for (const status of keyStatuses) {
        try {
          // Используем weight (не weight_kg!) из схемы
          const weightResult = await db.execute(sql`
            SELECT COALESCE(SUM(weight), 0)::float as total_weight 
            FROM pl 
            WHERE created_at <= ${endDateStr} AND status = ${status}
          `);
          
          row[status] = Math.round(weightResult?.rows?.[0]?.total_weight || 0);
        } catch (weightErr) {
          row[status] = 0;
        }
      }

      result.push(row);
    } catch (err) {
      log.error({ date, err: err.message }, "Weight dynamics error");
      result.push({ date });
    }
  }

  return result;
}
