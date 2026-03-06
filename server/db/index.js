// server/db/index.js
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pl, clients } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;

const isLocalDb =
  databaseUrl?.includes("localhost") ||
  databaseUrl?.includes("127.0.0.1");

const client = postgres(databaseUrl, {
  prepare: true,
  ...(isLocalDb ? {} : { ssl: "require" }),
});

export const db = drizzle(client);

console.log("✅ Connected to PostgreSQL");

async function init() {
  try {
    await client`CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    await client`ALTER TABLE pl ADD COLUMN IF NOT EXISTS client_id INTEGER`;

    console.log("✅ Tables ready: 'clients', 'pl'");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

init();