CREATE TABLE "recipe_cook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"cooked_on" date NOT NULL,
	"photo_url" text,
	"notes" text,
	"audio_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cook_log_not_empty" CHECK ("recipe_cook_logs"."photo_url" IS NOT NULL OR "recipe_cook_logs"."notes" IS NOT NULL OR "recipe_cook_logs"."audio_url" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "saved_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "voice_note_url" text;--> statement-breakpoint
ALTER TABLE "recipe_cook_logs" ADD CONSTRAINT "recipe_cook_logs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_cook_logs" ADD CONSTRAINT "recipe_cook_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cook_logs_user_recipe_idx" ON "recipe_cook_logs" USING btree ("user_id","recipe_id","cooked_on");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_recipe_unique" ON "saved_recipes" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "saved_recipes_user_idx" ON "saved_recipes" USING btree ("user_id");