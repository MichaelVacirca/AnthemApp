CREATE TYPE "public"."shift_type" AS ENUM('opening', 'closing');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"shift_type" "shift_type" NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"shift_type" "shift_type" NOT NULL,
	"business_date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "run_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pin_hash" text NOT NULL,
	"is_manager" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_role" (
	"staff_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "staff_role_staff_id_role_id_pk" PRIMARY KEY("staff_id","role_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist" ADD CONSTRAINT "checklist_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_checklist_id_checklist_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklist"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_run" ADD CONSTRAINT "checklist_run_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_run" ADD CONSTRAINT "checklist_run_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_run" ADD CONSTRAINT "checklist_run_checklist_id_checklist_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklist"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run_item" ADD CONSTRAINT "run_item_run_id_checklist_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."checklist_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run_item" ADD CONSTRAINT "run_item_item_id_checklist_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_item"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_role_shift_idx" ON "checklist" USING btree ("role_id","shift_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_business_date_idx" ON "checklist_run" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_staff_idx" ON "checklist_run" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_name_idx" ON "role" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "run_item_unique_idx" ON "run_item" USING btree ("run_id","item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_active_idx" ON "staff" USING btree ("active");