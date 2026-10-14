CREATE TYPE "public"."workout_category" AS ENUM('exercise', 'martial_arts', 'cardio', 'mobility');--> statement-breakpoint
CREATE TABLE "workout_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"category" "workout_category" NOT NULL,
	"title" text,
	"notes" text,
	"start_minutes" integer,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workout_start_minutes_range" CHECK ("workout_entries"."start_minutes" IS NULL OR ("workout_entries"."start_minutes" >= 0 AND "workout_entries"."start_minutes" < 1440)),
	CONSTRAINT "workout_duration_range" CHECK ("workout_entries"."duration_minutes" >= 5 AND "workout_entries"."duration_minutes" <= 720)
);
--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_entries_user_date_idx" ON "workout_entries" USING btree ("user_id","date");