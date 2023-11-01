import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "./db/schema"
import postgres from 'postgres';
import dotenv from "dotenv";
import { notes } from './db/schema';
import { eq, not, sql } from 'drizzle-orm';
import { randomInt, randomUUID } from 'crypto';
import { stringify } from 'querystring';
dotenv.config()
 
const pClient = postgres(process.env.CONSTR!, {max: 100});
const db = drizzle(pClient, {schema});

//await db.insert(notes).values({name : "Hmmm", status : schema.StatusEnum.enumValues[0]});
// const result = await db.select().from(notes);
// console.log(result);

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    
    const url = new URL(req.url);
    const path = url.pathname;
    let res;    
    if(req.method == "GET" && path == "/") res = Root();
    else if(req.method == "POST" && path == "/create") res = CreateTopic(url);
    else if(req.method == "PATCH" && path == "/addnote") res = AddNote(url);
    else if(req.method == "DELETE" && path == "/remove") res = RemoveNote(url);
    else if(req.method == "PATCH" && path == "/chngstatus") res = ChangeStatus(url);
    else if(req.method == "GET" && path == "/getnote") res = GetNote(url);
    else res = new Response("Not Found", {status: 404});
    
    return res;
  },
});

function Root() {
  return new Response("Hello");
}

async function CreateTopic(url : URL) {
  let name = url.searchParams.get("name");
  if(!name){
    return new Response("Missing or empty required query string", {
      status: 400,
    });
  }


  let noteurl = url.searchParams.get("noteurl");
  try {
    console.log(await db.select({name : notes.name}).from(notes).where(eq(notes.name, name)));
    if(((await db.select({name : notes.name}).from(notes).where(eq(notes.name, name)))).length > 0){
      return new Response("Topic already exist with this name", {status : 409});
    }

    if(!noteurl){
      await db.insert(notes).values({name, status : schema.StatusEnum.enumValues[0]})
    }else {
      await db.insert(notes).values({name, status : schema.StatusEnum.enumValues[0], notesPath : [saveFile(name, noteurl)]})
    }
  }catch(err){
    console.log(err);
    return new Response("", {status: 500})
  }

  return new Response("Success", {status: 200});
}

async function AddNote(url: URL) {
    let name = url.searchParams.get("name");
    let noteurl = url.searchParams.get("noteurl");
    if (!name || !noteurl) {
      return new Response("Missing or empty required query string", { status: 400 });
    }

    try{
      let records = await db.select({ notesPath: notes.notesPath }).from(notes).where(eq(notes.name, name));
      if (records.length == 0) {
        return new Response("Topic doesn't exist.", {
          status: 204,
        });
      }


      let arr;
      if(records[0].notesPath){
        arr = records[0].notesPath;
        arr.push(saveFile(name, noteurl));
      }
      else{
       arr = [saveFile(name, noteurl)];
      }
      console.log(arr);
      await db.update(notes).set({notesPath : arr}).where(eq(notes.name, name));

    }catch(err) {
      console.log(err);
      return new Response("", { status: 500 });
    }
    
  return new Response();
}

function RemoveNote(url: URL) {
      let name = url.searchParams.get("name");
      let noteurl = url.searchParams.get("noteurl");
      if (!name || !noteurl) {
        return new Response("Missing or empty required query string", {
          status: 400,
        });
      }
  return new Response();
}

function ChangeStatus(url: URL) {
  return new Response();
}

function GetNote(url: URL) {
  return new Response();
}

function saveFile(topicName : string, downurl : string ) {
  let filename = randomInt(1111, 99999);
  let filepath = `notes/${topicName}/${filename}`;
  
  return filepath;
}
console.log(`Listening on http://localhost:${server.port} ...`);
