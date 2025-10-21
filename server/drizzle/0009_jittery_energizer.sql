CREATE TABLE "pl_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pl_id" integer NOT NULL,
	"author" text DEFAULT 'Логист' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pl_comments" ADD CONSTRAINT "pl_comments_pl_id_pl_id_fk" FOREIGN KEY ("pl_id") REFERENCES "public"."pl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pl_comments_pl" ON "pl_comments" USING btree ("pl_id");--> statement-breakpoint
CREATE INDEX "idx_pl_comments_pl_created" ON "pl_comments" USING btree ("pl_id","created_at");