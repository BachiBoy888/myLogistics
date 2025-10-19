CREATE TYPE "public"."consolidation_status_v2" AS ENUM('loaded', 'to_customs', 'released', 'kg_customs', 'delivered', 'closed');--> statement-breakpoint
CREATE TABLE "consolidation_pl" (
	"consolidation_id" uuid NOT NULL,
	"pl_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidation_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consolidation_id" uuid NOT NULL,
	"from_status" "consolidation_status_v2",
	"to_status" "consolidation_status_v2" NOT NULL,
	"note" text,
	"changed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cons_number" text NOT NULL,
	"title" text,
	"status" "consolidation_status_v2" DEFAULT 'loaded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consolidation_pl" ADD CONSTRAINT "consolidation_pl_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_pl" ADD CONSTRAINT "consolidation_pl_pl_id_pl_id_fk" FOREIGN KEY ("pl_id") REFERENCES "public"."pl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_status_history" ADD CONSTRAINT "consolidation_status_history_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pk_consolidation_pl" ON "consolidation_pl" USING btree ("consolidation_id","pl_id");--> statement-breakpoint
CREATE INDEX "idx_consolidation_pl_pl" ON "consolidation_pl" USING btree ("pl_id");--> statement-breakpoint
CREATE INDEX "idx_consolidation_pl_cons" ON "consolidation_pl" USING btree ("consolidation_id");--> statement-breakpoint
CREATE INDEX "idx_consolidation_status_history_cons" ON "consolidation_status_history" USING btree ("consolidation_id");--> statement-breakpoint
CREATE INDEX "idx_consolidation_status_history_to" ON "consolidation_status_history" USING btree ("to_status");--> statement-breakpoint
CREATE INDEX "idx_consolidations_cons_number" ON "consolidations" USING btree ("cons_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_consolidations_cons_number" ON "consolidations" USING btree ("cons_number");--> statement-breakpoint
CREATE INDEX "idx_consolidations_status" ON "consolidations" USING btree ("status");