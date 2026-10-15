CREATE TABLE "workout_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"glyph" text NOT NULL,
	"shade" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_entries" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_entries" ADD COLUMN "type_id" integer;--> statement-breakpoint
ALTER TABLE "workout_types" ADD CONSTRAINT "workout_types_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_types_user_idx" ON "workout_types" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_type_id_workout_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."workout_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_entries_type_idx" ON "workout_entries" USING btree ("type_id");--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_one_icon" CHECK (("workout_entries"."category" IS NULL) <> ("workout_entries"."type_id" IS NULL));