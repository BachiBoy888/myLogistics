CREATE TABLE "pl_doc_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"old_status" text,
	"new_status" text NOT NULL,
	"note" text,
	"changed_by" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pl_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pl_id" integer NOT NULL,
	"doc_type" text NOT NULL,
	"name" text,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"storage_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"uploaded_by" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pl_doc_status_history" ADD CONSTRAINT "pl_doc_status_history_doc_id_pl_documents_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."pl_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pl_documents" ADD CONSTRAINT "pl_documents_pl_id_pl_id_fk" FOREIGN KEY ("pl_id") REFERENCES "public"."pl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pl_documents_pl_id" ON "pl_documents" USING btree ("pl_id");--> statement-breakpoint
CREATE INDEX "idx_pl_documents_doc_type" ON "pl_documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "idx_pl_documents_status" ON "pl_documents" USING btree ("status");