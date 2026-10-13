-- Communities, community members, per-community dishes, and recipe visibility.
--
-- NOTE: only the NEW objects are listed here. The user, session, account,
-- verification, recipes, recipe_* tables and the recipe_difficulty enum already
-- exist in the live database (they were created with `drizzle-kit push`, not
-- migration 0000), so this file deliberately does not recreate them.
-- Existing recipes are backfilled as 'public' by the column default.

CREATE TYPE "public"."community_member_status" AS ENUM('pending', 'active');--> statement-breakpoint
CREATE TYPE "public"."community_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."community_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."recipe_visibility" AS ENUM('private', 'community', 'public');--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"visibility" "community_visibility" DEFAULT 'public' NOT NULL,
	"invite_code" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "communities_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" "community_role" DEFAULT 'member' NOT NULL,
	"status" "community_member_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "community_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "dish_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "visibility" "recipe_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "community_visibility_needs_community" CHECK ("recipes"."visibility" <> 'community' OR "recipes"."community_id" IS NOT NULL);--> statement-breakpoint
CREATE INDEX "communities_visibility_idx" ON "communities" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "community_member_unique" ON "community_members" USING btree ("community_id","user_id");--> statement-breakpoint
CREATE INDEX "community_members_user_idx" ON "community_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dish_community_slug_unique" ON "dishes" USING btree ("community_id","slug");--> statement-breakpoint
CREATE INDEX "recipes_community_idx" ON "recipes" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "recipes_dish_idx" ON "recipes" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "recipes_visibility_idx" ON "recipes" USING btree ("visibility");
