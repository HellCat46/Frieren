import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";
import postgres from "postgres";
import dotenv from "dotenv";
import { topic } from "./db/schema";
import { eq, not, sql } from "drizzle-orm";
import { randomInt, randomUUID } from "crypto";
import { PgSchema } from "drizzle-orm/pg-core";
dotenv.config();

const pClient = postgres(process.env.CONSTR!, { max: 100 });
const db = drizzle(pClient, { schema });

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    let res;

    // Checks for all the endpoints
    if (req.method == "GET" && path == "/") res = Root(req.method);
    else if (path == "/getnote") res = GetNote(req.method, url);
    else if (path == "/listtopic") res = ListTopics(req.method);
    else if (path == "/create") res = CreateTopic(req.method, url);
    else if (path == "/addnote") res = AddNote(req.method, url);
    else if (path == "/remove") res = RemoveNote(req.method, url);
    else if (path == "/chngstatus") res = ChangeStatus(req.method, url);
    else res = new Response("", { status: 404 });

    return res;
  },
});

function Root(reqmethod: string) {
  if (reqmethod != "GET") return new Response("", { status: 405 }); // Check for proper http method

  return new Response(JSON.stringify({ status: 200, message: "Hello" }));
}

// Returns the image url of given page no
function GetNote(reqmethod: string, url: URL) {
  if (reqmethod != "GET") return new Response("", { status: 405 });

  return new Response();
}

// Returns List of topic with only topic's id and name
async function ListTopics(reqmethod: string) {
  if (reqmethod != "GET") return new Response("", { status: 405 });

  return new Response()
}

// Creates a new topic in database and returns it's id
// Also creates a folder in directory to save Topic's notes
async function CreateTopic(reqmethod: string, url: URL) {
  if (reqmethod != "POST") return new Response("", { status: 405 }); // Check for proper http method

  let name = url.searchParams.get("name"); 
  if (!name)
    return new Response("Missing or empty required query string", {
      status: 400,
    });

  let noteurl = url.searchParams.get("noteurl");
  try {
    if (
      (
        await db
          .select({ name: topic.name })
          .from(topic)
          .where(eq(topic.name, name))
      ).length > 0
    ) {
      return new Response("Topic already exist with this name", {
        status: 409,
      });
    }

    // Checks if first page url is provided or not and creat values object accordingly
    let values;
    if (!noteurl) values = { name, status: schema.StatusEnum.enumValues[0] };
    else values = {
        name,
        status: schema.StatusEnum.enumValues[0],
        notePaths: [saveFile(name, noteurl)],
      };

    let id = (
      await db.insert(topic).values(values).returning({ id: topic.id })
    )[0].id;

    return new Response(JSON.stringify({ id, status: 200 }));
  } catch (err) {
    console.error(err);
    return new Response("", { status: 500 });
  }
}


// Adds more pages to already created topic 
// Returns total number of pages for the topic 
async function AddNote(reqmethod: string, url: URL) {
  if (reqmethod != "PATCH") return new Response("", { status: 405 });

  let name = url.searchParams.get("name");
  let noteurl = url.searchParams.get("noteurl");
  if (!name || !noteurl) {
    return new Response("Missing or empty required query string", {
      status: 400,
    });
  }

  try {
    let records = await db
      .select({ notePaths: topic.notePaths })
      .from(topic)
      .where(eq(topic.name, name));
    if (records.length == 0) {
      return new Response("Topic doesn't exist.", {
        status: 204,
      });
    }

    // Checks if topic already have some pages or not 
    let arr: Array<string>;
    if (records[0].notePaths)
      arr = [...records[0].notePaths, saveFile(name, noteurl)];
    else arr = [saveFile(name, noteurl)];

    await db.update(topic).set({ notePaths: arr }).where(eq(topic.name, name));


    return new Response(
      JSON.stringify({ page_count: arr.length, status: 200 })
    );
  } catch (err) {
    console.error(err);
    return new Response("", { status: 500 });
  }
}

// Remove a page from the topic records
function RemoveNote(reqmethod: string, url: URL) {
  if (reqmethod != "DELETE") return new Response("", { status: 405 });

  let name = url.searchParams.get("name");
  let noteurl = url.searchParams.get("noteurl");
  if (!name || !noteurl) {
    return new Response("Missing or empty required query string", {
      status: 400,
    });
  }
  return new Response();
}

// Change status of topic
// Closed will not allow adding more pages
// Archive will create a pdf from all the topic's page and return it
function ChangeStatus(reqmethod: string, url: URL) {
  if (reqmethod != "PATCH") return new Response("", { status: 405 });

  return new Response();
}

function saveFile(topicName: string, downurl: string) {
  let filename = randomInt(1111, 99999);
  let filepath = `notes/${topicName}/${filename}`;

  return filepath;
}
console.log(`Listening on http://localhost:${server.port} ...`);
