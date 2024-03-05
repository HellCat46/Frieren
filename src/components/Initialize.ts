import { mkdirSync } from "node:fs";
import { Pool } from "pg";
import { archivefolder, notesfolder } from "./ManageFiles";

export async function InitializeDatabase(dbpool: Pool) {
  await dbpool
    .query(
      `DO $$ BEGIN
    CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`
    )
    .then(() => console.log("[Database] Successfully created status Enum."))
    .catch((err: Error) => {
      console.error("[Database] Failed to create status Enum.");
      throw err;
    });

  await dbpool
    .query(
      `CREATE TABLE IF NOT EXISTS "topic" (
	"_id" serial PRIMARY KEY NOT NULL,
	"_name" varchar(50) NOT NULL,
	"_status" "_status" NOT NULL,
	"_pagePaths" varchar(41)[] NOT NULL,
	"_archivePath" varchar(50),
	CONSTRAINT "topic__name_unique" UNIQUE("_name")
  );`
    )
    .then(() => console.log("[Database] Successfully created Table topic."))
    .catch((err: Error) => {
      console.error("[Database] Failed to create Table topic.");
      throw err;
    });

  await dbpool
    .query(
      `CREATE TABLE IF NOT EXISTS "playlist" ( "_userId" varchar(20) PRIMARY KEY NOT NULL, "_songIds" varchar[20])`
    )
    .then(() => console.log("[Database] Successfully create Table playlist."))
    .catch((err: Error) => {
      console.error("[Database] Failed to create Table playlist.");
      console.log(err);
    });
}

export function InitializeFileModule() {
  mkdirSync(notesfolder, { recursive: true });
  mkdirSync(archivefolder, { recursive: true });
}