// server/db/index.js
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pl, clients } from './schema.js';


// подключаемся к базе
const client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
export const db = drizzle(client);

console.log('✅ Connected to PostgreSQL');

async function init() {
  try {
    // 1) clients
    await client`CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // 2) pl (уже есть) — гарантируем поле client_id
    await client`ALTER TABLE pl ADD COLUMN IF NOT EXISTS client_id INTEGER`;

    // (Опционально: FK — можно добавить позже миграцией)
    // DO $$ BEGIN
    //   ALTER TABLE pl ADD CONSTRAINT pl_client_fk
    //     FOREIGN KEY (client_id) REFERENCES clients(id);
    // EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    console.log("✅  Tables ready: 'clients', 'pl'");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

init();