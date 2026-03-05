// server/routes/analytics.js
// API для аналитических данных

import { z } from "zod";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { pl, clients } from "../db/schema.js";

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

      const [clientDynamics, plByStatus, weightDynamics] = await Promise.all([
        getClientDynamics(db, dateRange, granularity),
        getPLByStatus(db, dateRange, granularity),
        getWeightDynamics(db, dateRange, granularity),
      ]);

      return { clientDynamics, plByStatus, weightDynamics };
    } catch (err) {
      console.error("Analytics error:", err);
      return reply.status(400).send({ error: err.message });
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

async function getClientDynamics(db, dateRange) {
  const result = [];

  for (const date of dateRange) {
    const endDateStr = date + "T23:59:59.999Z";

    // Всего клиентов (созданные до этой даты включительно)
    const totalResult = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(clients)
      .where(sql`${clients.createdAt} <= ${endDateStr}`);

    // Клиенты в статусе обращения (есть PL в статусе draft)
    const inquiryResult = await db.execute(sql`
      SELECT COUNT(DISTINCT c.id)::int as count
      FROM clients c
      INNER JOIN pl ON pl.client_id = c.id
      WHERE c.created_at <= ${endDateStr}
      AND pl.status = 'draft'
    `);

    // Активные клиенты (есть PL не в draft/cancelled/closed)
    const activeResult = await db.execute(sql`
      SELECT COUNT(DISTINCT c.id)::int as count
      FROM clients c
      INNER JOIN pl ON pl.client_id = c.id
      WHERE c.created_at <= ${endDateStr}
      AND pl.status NOT IN ('draft', 'closed', 'cancelled')
    `);

    result.push({
      date,
      total: totalResult[0]?.count || 0,
      inquiry: inquiryResult.rows[0]?.count || 0,
      active: activeResult.rows[0]?.count || 0,
    });
  }

  return result;
}

async function getPLByStatus(db, dateRange) {
  const result = [];
  const allStatuses = [
    "draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
    "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"
  ];

  for (const date of dateRange) {
    const endDateStr = date + "T23:59:59.999Z";
    const row = { date };

    for (const status of allStatuses) {
      const countResult = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(pl)
        .where(sql`${pl.createdAt} <= ${endDateStr} AND ${pl.status} = ${status}`);
      
      row[status] = countResult[0]?.count || 0;
    }

    result.push(row);
  }

  return result;
}

async function getWeightDynamics(db, dateRange) {
  const result = [];
  const keyStatuses = ["awaiting_docs", "to_load", "released", "kg_customs"];

  for (const date of dateRange) {
    const endDateStr = date + "T23:59:59.999Z";
    const row = { date };

    for (const status of keyStatuses) {
      const weightResult = await db
        .select({ 
          totalWeight: sql`COALESCE(SUM(${pl.weight_kg}), 0)::int` 
        })
        .from(pl)
        .where(sql`${pl.createdAt} <= ${endDateStr} AND ${pl.status} = ${status}`);
      
      row[status] = weightResult[0]?.totalWeight || 0;
    }

    result.push(row);
  }

  return result;
}
