CREATE TABLE "saves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" uuid NOT NULL,
	"save_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"clerk_user_id" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_updated_idx" ON "saves" ("userId","updated_at");--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id");