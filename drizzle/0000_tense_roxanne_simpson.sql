DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"surname" varchar(100) NOT NULL,
	"age" integer NOT NULL,
	"gender" "gender" NOT NULL,
	"nationality" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(20),
	"address" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
