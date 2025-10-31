ALTER TABLE "pl" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pl" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "pl" ADD COLUMN "pl_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pl" ADD CONSTRAINT "pl_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pl" ADD CONSTRAINT "pl_pl_number_unique" UNIQUE("pl_number");