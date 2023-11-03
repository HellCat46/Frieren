
import { not, relations } from "drizzle-orm";
import { pgTable, pgEnum, serial, varchar, uniqueIndex} from "drizzle-orm/pg-core";

export const StatusEnum = pgEnum("_status", ["Open", "Closed", "Archived"])


export const topic = pgTable("topic", {
    id: serial("_id").primaryKey(),
    name: varchar("_name", {length : 50}).unique().notNull(),
    status : StatusEnum("_status").notNull(),
    notePaths : varchar("_notePaths", {length: 50}).array().notNull(),
    archivepath : varchar("_archivePath", {length : 50})
})