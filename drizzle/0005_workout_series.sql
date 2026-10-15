ALTER TABLE "workout_entries" ADD COLUMN "series_id" text;--> statement-breakpoint
CREATE INDEX "workout_entries_series_idx" ON "workout_entries" USING btree ("series_id");