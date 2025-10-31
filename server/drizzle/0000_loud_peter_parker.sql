CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"company" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pl" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" numeric(12, 3),
	"volume" numeric(12, 3),
	"client_id" integer,
	"created_at" timestamp DEFAULT now()
);
