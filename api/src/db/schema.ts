
import { not, relations } from "drizzle-orm";
import { pgTable, pgEnum, serial, varchar, uniqueIndex} from "drizzle-orm/pg-core";

export const StatusEnum = pgEnum("_status", ["Open", "Closed", "Archived"])


export const notes = pgTable("notes", {
    id: serial("_id").primaryKey(),
    name: varchar("_name", {length : 50}).unique().notNull(),
    status : StatusEnum("_status").notNull(),
    notesPath : varchar("_notesPath", {length: 50}).array(),
    archivepath : varchar("_archivePath", {length : 50})
}, (notes) => {
    return {
        idx : uniqueIndex("name_idx").on(notes.name)
    }
})
// export const notesRelation = relations(notes, ({one}) => ({
//     name : one(notes, {

//     })
// }))