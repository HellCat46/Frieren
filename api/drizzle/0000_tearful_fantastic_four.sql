DO $$ BEGIN
 CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"_id" serial PRIMARY KEY NOT NULL,
	"_name" varchar(50) NOT NULL,
	"_status" "_status" NOT NULL,
	"_notesPath" varchar(50)[],
	"_archivePath" varchar(50),
	CONSTRAINT "notes__name_unique" UNIQUE("_name")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "name_idx" ON "notes" ("_name");