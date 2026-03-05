// server/routes/analytics.js
// API для аналитических данных

import { z } from "zod";
import { and, gte, lte, sql } from "drizzle-orm";
import { pl, clients, consolidations } from "../db/schema.js";

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(["day", "week", "month"]),
});

export default async function analyticsRoutes(app) {
  const db = app.drizzle;

  // Получение аналитических данных
  app.get("/", async (req, reply) => {
    try {
      const query = QuerySchema.parse(req.query);
      const { from, to, granularity } = query;

      // Генерируем диапазон дат
      const dateRange = generateDateRange(from, to, granularity);

      // Получаем данные для каждого графика
      const [
        clientDynamics,
        plByStatus,
        weightDynamics,
      ] = await Promise.all([
        getClientDynamics(db, dateRange, granularity),
        getPLByStatus(db, dateRange, granularity),
        getWeightDynamics(db, dateRange, granularity),
      ]);

      return {
        clientDynamics,
        plByStatus,
        weightDynamics,
      };
    } catch (err) {
      console.error("Analytics error:", err);
      return reply.status(400).send({ error: err.message });
    }
  });
}

// Генерация диапазона дат
function generateDateRange(from, to, granularity) {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);
  let current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current).toISOString().split("T")[0]);
    
    if (granularity === "day") {
      current.setDate(current.getDate() + 1);
    } else if (granularity === "week") {
      current.setDate(current.getDate() + 7);
    } else if (granularity === "month") {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return dates;
}

// Динамика клиентов
async function getClientDynamics(db, dateRange, granularity) {
  const result = [];

  for (const date of dateRange) {
    const dateObj = new Date(date);
    const endDate = new Date(date);
    
    if (granularity === "day") {
      endDate.setDate(endDate.getDate() + 1);
    } else if (granularity === "week") {
      endDate.setDate(endDate.getDate() + 7);
    } else if (granularity === "month") {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Всего клиентов (созданные до этой даты)
    const [totalResult] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(clients)
      .where(lte(clients.createdAt, endDate.toISOString()));

    // Клиенты в статусе обращения (draft)
    const [inquiryResult] = await db
      .select({ count: sql`COUNT(DISTINCT ${clients.id})::int` })
      .from(clients)
      .innerJoin(pl, sql`${pl.client_id} = ${clients.id}`)
      .where(and(
        lte(clients.createdAt, endDate.toISOString()),
        sql`${pl.status} = 'draft'`
      ));

    // Активные клиенты (есть PL не в draft и не closed)
    const [activeResult] = await db
      .select({ count: sql`COUNT(DISTINCT ${clients.id})::int` })
      .from(clients)
      .innerJoin(pl, sql`${pl.client_id} = ${clients.id}`)
      .where(and(
        lte(clients.createdAt, endDate.toISOString()),
        sql`${pl.status} NOT IN ('draft', 'closed', 'cancelled')`
      ));

    result.push({
      date,
      total: totalResult?.count || 0,
      inquiry: inquiryResult?.count || 0,
      active: activeResult?.count || 0,
    });
  }

  return result;
}

// PL по статусам
async function getPLByStatus(db, dateRange, granularity) {
  const result = [];
  const allStatuses = [
    "draft", "awaiting_docs", "awaiting_load", "to_load", "loaded",
    "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"
  ];

  for (const date of dateRange) {
    const dateObj = new Date(date);
    const endDate = new Date(date);
    
    if (granularity === "day") {
      endDate.setDate(endDate.getDate() + 1);
    } else if (granularity === "week") {
      endDate.setDate(endDate.getDate() + 7);
    } else if (granularity === "month") {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const row = { date };

    // Для каждого статуса считаем количество PL
    for (const status of allStatuses) {
      const [countResult] = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(pl)
        .where(and(
          lte(pl.createdAt, endDate.toISOString()),
          sql`${pl.status} = ${status}`
        ));
      
      row[status] = countResult?.count || 0;
    }

    result.push(row);
  }

  return result;
}

// Динамика веса по ключевым статусам
async function getWeightDynamics(db, dateRange, granularity) {
  const result = [];
  const keyStatuses = ["awaiting_docs", "to_load", "released", "kg_customs"];

  for (const date of dateRange) {
    const dateObj = new Date(date);
    const endDate = new Date(date);
    
    if (granularity === "day") {
      endDate.setDate(endDate.getDate() + 1);
    } else if (granularity === "week") {
      endDate.setDate(endDate.getDate() + 7);
    } else if (granularity === "month") {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const row = { date };

    for (const status of keyStatuses) {
      const [weightResult] = await db
        .select({ 
          totalWeight: sql`COALESCE(SUM(${pl.weight_kg}), 0)::int` 
        })
        .from(pl)
        .where(and(
          lte(pl.createdAt, endDate.toISOString()),
          sql`${pl.status} = ${status}`
        ));
      
      row[status] = weightResult?.totalWeight || 0;
    }

    result.push(row);
  }

  return result;
}
