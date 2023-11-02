DO $$ BEGIN
 CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic" (
	"_id" serial PRIMARY KEY NOT NULL,
	"_name" varchar(50) NOT NULL,
	"_status" "_status" NOT NULL,
	"_notePaths" varchar(50)[],
	"_archivePath" varchar(50),
	CONSTRAINT "topic__name_unique" UNIQUE("_name")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "name_idx" ON "topic" ("_name");