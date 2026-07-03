DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('admin', 'cashier', 'manager');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'cashier' NOT NULL;