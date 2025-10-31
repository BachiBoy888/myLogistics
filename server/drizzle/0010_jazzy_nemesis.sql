CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pl_comments" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_login" ON "users" USING btree ("login");--> statement-breakpoint
ALTER TABLE "pl_comments" ADD CONSTRAINT "pl_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;