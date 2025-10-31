// server/db/schema.js
import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  index,
  uniqueIndex,
  uuid,
  bigint,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* =======================
   Базовые таблицы
======================= */

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  phone2: text("phone2"),
  email: text("email"),
  notes: text("notes"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    login: text("login").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uqLogin: uniqueIndex("uq_users_login").on(t.login),
  })
);

export const pl = pgTable(
  "pl",
  {
    id: serial("id").primaryKey(), // INTEGER PK
    plNumber: text("pl_number"),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Основные данные PL
    name: text("name").notNull(),
    weight: numeric("weight", { precision: 12, scale: 3 }),
    volume: numeric("volume", { precision: 12, scale: 3 }),
    incoterm: text("incoterm"),
    pickupAddress: text("pickup_address"),
    shipperName: text("shipper_name"),
    shipperContacts: text("shipper_contacts"),
    status: text("status").default("draft"),

    // Цена для клиента
    clientPrice: numeric("client_price", { precision: 12, scale: 2 }).default("0"),
    

    // ⬇️ Снимок калькулятора (все входы/итоги расчёта) — JSONB
    calculator: jsonb("calculator").default(sql`'{}'::jsonb`).notNull(),

    // Ответственный: user с ролью «логист» (nullable)
    responsibleUserId: uuid("responsible_user_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    plNumberIdx: index("pl_number_idx").on(t.plNumber),
    plNumberUq: uniqueIndex("pl_number_unique").on(t.plNumber),
    responsibleIdx: index("idx_pl_responsible").on(t.responsibleUserId),
  })
);

/* =======================
   Документы PL
======================= */

export const plDocuments = pgTable(
  "pl_documents",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(), // UUID PK
    plId: integer("pl_id")
      .notNull()
      .references(() => pl.id, { onDelete: "cascade" }),

    docType: text("doc_type").notNull(), // 'invoice' | 'packing_list' | ...
    name: text("name"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storagePath: text("storage_path").notNull(), // /uploads/pl/<plId>/<stored>
    status: text("status").notNull().default("pending"), // pending | reviewed | approved | rejected
    note: text("note"),
    uploadedBy: text("uploaded_by"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPlId: index("idx_pl_documents_pl_id").on(t.plId),
    byType: index("idx_pl_documents_doc_type").on(t.docType),
    byStatus: index("idx_pl_documents_status").on(t.status),
    uqDocPerType: uniqueIndex("uq_pl_doc_type").on(t.plId, t.docType),
  })
);

// История статусов документов
export const plDocStatusHistory = pgTable("pl_doc_status_history", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  docId: uuid("doc_id")
    .notNull()
    .references(() => plDocuments.id, { onDelete: "cascade" }),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  note: text("note"),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =======================
   Консолидации
======================= */

export const consolidationStatusEnum = pgEnum("consolidation_status_v2", [
  "loaded",       // Погружено
  "to_customs",   // Оформление Китай
  "released",     // В пути
  "kg_customs",   // Растаможка Кыргызстан
  "delivered",    // Оплата
  "closed",       // Закрыто
]);

export const consolidations = pgTable(
  "consolidations",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    consNumber: text("cons_number").notNull(),  // CONS-YYYY-N
    title: text("title"),
    status: consolidationStatusEnum("status").notNull().default("loaded"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    consNumberIdx: index("idx_consolidations_cons_number").on(t.consNumber),
    consNumberUq: uniqueIndex("uq_consolidations_cons_number").on(t.consNumber),
    statusIdx: index("idx_consolidations_status").on(t.status),
  })
);

export const consolidationPl = pgTable(
  "consolidation_pl",
  {
    consolidationId: uuid("consolidation_id")
      .notNull()
      .references(() => consolidations.id, { onDelete: "cascade" }),
    plId: integer("pl_id")
      .notNull()
      .references(() => pl.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex("pk_consolidation_pl").on(t.consolidationId, t.plId),
    byPl: index("idx_consolidation_pl_pl").on(t.plId),
    byCons: index("idx_consolidation_pl_cons").on(t.consolidationId),
  })
);

export const consolidationStatusHistory = pgTable(
  "consolidation_status_history",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    consolidationId: uuid("consolidation_id")
      .notNull()
      .references(() => consolidations.id, { onDelete: "cascade" }),
    fromStatus: consolidationStatusEnum("from_status"),
    toStatus: consolidationStatusEnum("to_status").notNull(),
    note: text("note"),
    changedBy: text("changed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCons: index("idx_consolidation_status_history_cons").on(t.consolidationId),
    byToStatus: index("idx_consolidation_status_history_to").on(t.toStatus),
  })
);

/* =======================
   Комментарии PL
======================= */

export const plComments = pgTable(
  "pl_comments",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    plId: integer("pl_id")
      .notNull()
      .references(() => pl.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    author: text("author").notNull().default("Логист"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPl: index("idx_pl_comments_pl").on(t.plId),
    byPlCreated: index("idx_pl_comments_pl_created").on(t.plId, t.createdAt),
  })
);

/* =======================
   Процессные события PL
======================= */

export const plEvents = pgTable(
  "pl_events",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    plId: integer("pl_id")
      .notNull()
      .references(() => pl.id, { onDelete: "cascade" }),
    type: text("type").notNull(),         // 'pl.created' | 'pl.status_changed' | ...
    message: text("message").notNull(),
    meta: jsonb("meta").default(sql`'{}'::jsonb`), // ← JS-совместимый дефолт
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPl: index("idx_pl_events_pl").on(t.plId),
    byPlCreated: index("idx_pl_events_created").on(t.plId, t.createdAt),
    byActor: index("idx_pl_events_actor").on(t.actorUserId),
  })
);