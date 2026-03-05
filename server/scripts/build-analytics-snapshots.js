#!/usr/bin/env node
// server/scripts/build-analytics-snapshots.js
// Ежедневная сборка snapshot'ов для аналитики
// Запускать: node server/scripts/build-analytics-snapshots.js [YYYY-MM-DD]

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema.js";
import { sql } from "drizzle-orm";

const ACTIVE_STATUSES = [
  "awaiting_docs",
  "awaiting_load",
  "to_load",
  "to_customs",
  "released",
  "kg_customs",
  "collect_payment",
];

const WEIGHT_STATUSES = ["awaiting_docs", "to_load", "released", "kg_customs"];

const ALL_PL_STATUSES = [
  "draft",
  "awaiting_docs",
  "awaiting_load",
  "to_load",
  "loaded",
  "to_customs",
  "released",
  "kg_customs",
  "collect_payment",
  "delivered",
  "closed",
];

function getYesterdayInBishkek() {
  const now = new Date();
  // Форматируем в Asia/Bishkek (UTC+6)
  const bishkekTime = now.toLocaleString("en-US", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = bishkekTime.split("/");
  
  // Создаем дату вчера
  const yesterday = new Date(`${year}-${month}-${day}T00:00:00+06:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return yesterday.toISOString().split("T")[0];
}

async function main() {
  // Определяем день для snapshot
  const snapshotDay = process.argv[2] || getYesterdayInBishkek();
  console.log(`🔄 Building analytics snapshots for: ${snapshotDay}`);

  // Подключаемся к БД
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });
  const sourceTs = new Date();

  try {
    // 1. Рассчитываем метрики клиентов
    console.log("📊 Calculating client metrics...");
    
    // Total clients (все клиенты)
    const totalClientsResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM clients`
    );
    const totalClients = totalClientsResult.rows[0]?.count || 0;

    // Inquiry clients (клиенты со статусом draft)
    const inquiryClientsResult = await db.execute(
      sql`SELECT COUNT(DISTINCT client_id)::int as count FROM pl WHERE status = 'draft'`
    );
    const inquiryClients = inquiryClientsResult.rows[0]?.count || 0;

    // Active clients (уникальные client_id в активных статусах)
    const activeClientsResult = await db.execute(sql`
      SELECT COUNT(DISTINCT client_id)::int as count 
      FROM pl 
      WHERE status IN (${sql.join(ACTIVE_STATUSES.map(s => sql.raw(`'${s}'`)), sql.raw(","))})
    `);
    const activeClients = activeClientsResult.rows[0]?.count || 0;

    console.log(`  Total clients: ${totalClients}`);
    console.log(`  Inquiry clients: ${inquiryClients}`);
    console.log(`  Active clients: ${activeClients}`);

    // UPSERT в analytics_daily_snapshots
    await db.execute(sql`
      INSERT INTO analytics_daily_snapshots (day, generated_at, source_ts, total_clients, inquiry_clients, active_clients)
      VALUES (${snapshotDay}::date, ${sourceTs}, ${sourceTs}, ${totalClients}, ${inquiryClients}, ${activeClients})
      ON CONFLICT (day) DO UPDATE SET
        generated_at = EXCLUDED.generated_at,
        source_ts = EXCLUDED.source_ts,
        total_clients = EXCLUDED.total_clients,
        inquiry_clients = EXCLUDED.inquiry_clients,
        active_clients = EXCLUDED.active_clients
    `);

    // 2. Рассчитываем PL по статусам
    console.log("📊 Calculating PL by status...");
    
    const plByStatusResult = await db.execute(sql`
      SELECT status, COUNT(*)::int as count
      FROM pl
      GROUP BY status
    `);

    const plStatusMap = new Map(plByStatusResult.rows.map(r => [r.status, r.count]));
    
    // Удаляем старые записи за этот день и вставляем новые
    await db.execute(sql`DELETE FROM analytics_daily_pl_status WHERE day = ${snapshotDay}::date`);
    
    for (const status of ALL_PL_STATUSES) {
      const count = plStatusMap.get(status) || 0;
      await db.execute(sql`
        INSERT INTO analytics_daily_pl_status (day, status, pl_count)
        VALUES (${snapshotDay}::date, ${status}, ${count})
      `);
    }

    const totalPl = [...plStatusMap.values()].reduce((a, b) => a + b, 0);
    console.log(`  Total PL: ${totalPl}`);
    console.log(`  Status breakdown: ${plByStatusResult.rows.map(r => `${r.status}=${r.count}`).join(", ")}`);

    // 3. Рассчитываем вес по статусам
    console.log("📊 Calculating weight by status...");
    
    const weightByStatusResult = await db.execute(sql`
      SELECT status, COALESCE(SUM(weight), 0)::numeric as total_weight
      FROM pl
      WHERE status IN (${sql.join(WEIGHT_STATUSES.map(s => sql.raw(`'${s}'`)), sql.raw(","))})
      GROUP BY status
    `);

    const weightStatusMap = new Map(weightByStatusResult.rows.map(r => [r.status, r.total_weight]));

    // Удаляем старые записи за этот день и вставляем новые
    await db.execute(sql`DELETE FROM analytics_daily_weight_status WHERE day = ${snapshotDay}::date`);
    
    for (const status of WEIGHT_STATUSES) {
      const weight = weightStatusMap.get(status) || 0;
      await db.execute(sql`
        INSERT INTO analytics_daily_weight_status (day, status, total_weight)
        VALUES (${snapshotDay}::date, ${status}, ${weight})
      `);
    }

    const totalWeight = [...weightStatusMap.values()].reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
    console.log(`  Total weight (4 statuses): ${totalWeight.toFixed(3)} kg`);
    console.log(`  Weight breakdown: ${weightByStatusResult.rows.map(r => `${r.status}=${r.total_weight}`).join(", ")}`);

    console.log(`\n✅ Snapshots built successfully for ${snapshotDay}`);
    console.log(`   Generated at: ${sourceTs.toISOString()}`);

  } catch (err) {
    console.error("❌ Error building snapshots:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
