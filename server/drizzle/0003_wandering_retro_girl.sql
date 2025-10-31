ALTER TABLE "pl" DROP CONSTRAINT "pl_pl_number_unique";--> statement-breakpoint
ALTER TABLE "pl" ALTER COLUMN "pl_number" DROP NOT NULL;