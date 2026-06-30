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
	"age" integer,
	"date_of_birth" timestamp NOT NULL,
	"gender" "gender" NOT NULL,
	"nationality" varchar(100),
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"provider" varchar(50) DEFAULT 'local' NOT NULL,
	"provider_id" varchar(255),
	"phone_number" varchar(20),
	"address" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"avatar_url" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
