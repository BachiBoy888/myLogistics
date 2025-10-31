CREATE TABLE "pl_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pl_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pl" ADD COLUMN "responsible_user_id" uuid;--> statement-breakpoint
ALTER TABLE "pl_events" ADD CONSTRAINT "pl_events_pl_id_pl_id_fk" FOREIGN KEY ("pl_id") REFERENCES "public"."pl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pl_events" ADD CONSTRAINT "pl_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pl_events_pl" ON "pl_events" USING btree ("pl_id");--> statement-breakpoint
CREATE INDEX "idx_pl_events_created" ON "pl_events" USING btree ("pl_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pl_events_actor" ON "pl_events" USING btree ("actor_user_id");--> statement-breakpoint
ALTER TABLE "pl" ADD CONSTRAINT "pl_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pl_responsible" ON "pl" USING btree ("responsible_user_id");