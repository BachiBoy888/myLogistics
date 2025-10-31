CREATE INDEX "pl_number_idx" ON "pl" USING btree ("pl_number");--> statement-breakpoint
CREATE UNIQUE INDEX "pl_number_unique" ON "pl" USING btree ("pl_number");