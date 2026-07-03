ALTER TABLE "refresh_tokens" ADD COLUMN "session_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_unique" UNIQUE("session_id");