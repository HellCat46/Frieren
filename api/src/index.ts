import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "./db/schema"
import postgres from 'postgres';
import dotenv from "dotenv";
import { notes } from './db/schema';
import { sql } from 'drizzle-orm';
dotenv.config()

// const migrationClient = postgres(process.env.CONSTR!, { max: 1 });
// migrate(drizzle(migrationClient), {migrationsFolder : "./drizzle"});
 
const pClient = postgres(process.env.CONSTR!, {max: 100});
const db = drizzle(pClient, {schema});

//await db.insert(notes).values({name : "Hmmm", status : schema.StatusEnum.enumValues[0]});
const result = await db.select().from(notes);
console.log(result);

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    let res;    
    if(req.method == "GET" && path == "/") res = Root();
    else if(req.method == "POST" && path == "/create") res = CreateTopic();
    else if(req.method == "PATCH" && path == "/addnote") res = AddNote();
    else if(req.method == "DELETE" && path == "/remove") res = RemoveNote();
    else if(req.method == "PATCH" && path == "/chngstatus") res = ChangeStatus();
    else if(req.method == "GET" && path == "/getnote") res = GetNote();
    else res = new Response("Not Found", {status: 404});
    
    return res;
  },
});

function Root() {
  return new Response("Hello");
}

function CreateTopic() {
  return new Response();
}

function AddNote(){
  return new Response();
}

function RemoveNote() {
  return new Response();
}

function ChangeStatus() {
  return new Response();
}

function GetNote() {
  return new Response();
}

console.log(`Listening on http://localhost:${server.port} ...`);
