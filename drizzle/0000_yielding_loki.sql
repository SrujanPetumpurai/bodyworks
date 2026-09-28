CREATE TYPE "public"."nutrient_metric_type" AS ENUM('daily_intake', 'body_store');--> statement-breakpoint
CREATE TYPE "public"."nutrient_source_type" AS ENUM('food', 'reference');--> statement-breakpoint
CREATE TYPE "public"."nutrient_value_type" AS ENUM('fixed', 'range', 'coefficient_per_kg', 'coefficient_per_cm');--> statement-breakpoint
CREATE TABLE "age_brackets" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "age_brackets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "body_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "body_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "foods_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "nutrient_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrient_id" integer NOT NULL,
	"point" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrient_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrient_id" integer NOT NULL,
	"body_type_id" integer NOT NULL,
	"age_bracket_id" integer NOT NULL,
	"metric_type" "nutrient_metric_type" DEFAULT 'daily_intake' NOT NULL,
	"value_type" "nutrient_value_type" DEFAULT 'fixed' NOT NULL,
	"min_value" numeric(10, 3) NOT NULL,
	"max_value" numeric(10, 3),
	"metric_unit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrient_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrient_id" integer NOT NULL,
	"source_type" "nutrient_source_type" DEFAULT 'reference' NOT NULL,
	"food_id" integer,
	"food_amount" numeric(10, 3),
	"food_unit" text,
	"nutrient_amount" numeric(10, 3),
	"nutrient_unit" text,
	"name" text,
	"description" text,
	"url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "food_fields_when_food" CHECK ("nutrient_sources"."source_type" <> 'food' OR (
        "nutrient_sources"."food_id" IS NOT NULL AND "nutrient_sources"."food_amount" IS NOT NULL AND
        "nutrient_sources"."food_unit" IS NOT NULL AND "nutrient_sources"."nutrient_amount" IS NOT NULL AND
        "nutrient_sources"."nutrient_unit" IS NOT NULL
      )),
	CONSTRAINT "name_when_reference" CHECK ("nutrient_sources"."source_type" <> 'reference' OR "nutrient_sources"."name" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "nutrients" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"importance" integer NOT NULL,
	"requires_body_metrics" boolean DEFAULT false NOT NULL,
	"uses_weight" boolean DEFAULT false NOT NULL,
	"uses_height" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nutrients_slug_unique" UNIQUE("slug"),
	CONSTRAINT "importance_range" CHECK ("nutrients"."importance" >= 1 AND "nutrients"."importance" <= 5)
);
--> statement-breakpoint
ALTER TABLE "nutrient_points" ADD CONSTRAINT "nutrient_points_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_requirements" ADD CONSTRAINT "nutrient_requirements_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_requirements" ADD CONSTRAINT "nutrient_requirements_body_type_id_body_types_id_fk" FOREIGN KEY ("body_type_id") REFERENCES "public"."body_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_requirements" ADD CONSTRAINT "nutrient_requirements_age_bracket_id_age_brackets_id_fk" FOREIGN KEY ("age_bracket_id") REFERENCES "public"."age_brackets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_sources" ADD CONSTRAINT "nutrient_sources_nutrient_id_nutrients_id_fk" FOREIGN KEY ("nutrient_id") REFERENCES "public"."nutrients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrient_sources" ADD CONSTRAINT "nutrient_sources_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nutrient_requirement_unique" ON "nutrient_requirements" USING btree ("nutrient_id","body_type_id","age_bracket_id","metric_type");