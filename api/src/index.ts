import * as schema from "./db/schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { topic } from "./db/schema";
import { eq, not } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mkdir, mkdirSync } from "node:fs";
import dotenv from "dotenv";
dotenv.config();

const pClient = postgres(process.env.CONSTR!, { max: 100 });
const db = drizzle(pClient, { schema });

let notesfolder = "files/notes";
let archivefolder = "files/archive";

mkdirSync("files/notes", { recursive: true });
mkdirSync("files/archive", { recursive: true });

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

  try {
    // Gets all the topics except archived ones
    let records = await db
      .select({ id: topic.id, name: topic.name })
      .from(topic)
      .where(not(eq(topic.status, schema.StatusEnum.enumValues[2])));

    // Merge all the properties from array of object into one object
    let listobj = Object.assign(
      {},
      ...records.map((item) => ({ [item.id]: item.name }))
    );

    return new Response(JSON.stringify(listobj), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("", { status: 500 });
  }
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

    mkdir(`${notesfolder}/${name}`, (err) => {
      if (err)
        return new Response(
          JSON.stringify({ status: 500, error: err.message }),
          { status: 500 }
        );
    });

    // Checks if first page url is provided or not and creat values object accordingly
    let values;
    if (!noteurl)
      values = { name, status: schema.StatusEnum.enumValues[0], notePaths: [] };
    else {
      let result = await saveFile(name, [], noteurl);
      if (result == null)
        return new Response(
          JSON.stringify({ err: "Error while saving the file", status: 500 }),
          { status: 500 }
        );

      values = {
        name,
        status: schema.StatusEnum.enumValues[0],
        notePaths: [result],
      };
    }
    let id = (
      await db.insert(topic).values(values).returning({ id: topic.id })
    )[0].id;

    return new Response(JSON.stringify({ id, status: 200 }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
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
    if (records.length == 0)
      return new Response("Topic doesn't exist.", {
        status: 204,
      });

    let result = await saveFile(name, records[0].notePaths, noteurl);
    if (result == null)
      return new Response(
        JSON.stringify({ err: "Error while saving the file", status: 500 }),
        { status: 500 }
      );

    let arr = [...records[0].notePaths, result];

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

/*
Change status of topic
Closed will not allow adding more pages
Archive will create a pdf from all the topic's page and return it
*/
function ChangeStatus(reqmethod: string, url: URL) {
  if (reqmethod != "PATCH") return new Response("", { status: 405 });

  return new Response();
}

async function saveFile(
  Topicname: string,
  filelist: string[],
  downurl: string
) {
  // Looks for Unique name for file
  let filename = randomUUID() + ".png";
  filelist.forEach((file) => {
    if (file == filename) {
      return saveFile(Topicname, filelist, downurl);
    }
  });

  try {
    const res = await fetch(downurl);
    const contenttype = res.headers.get("content-type");

    if (!contenttype) return null;
    if (!contenttype.startsWith("image")) return null;

    await Bun.write(
      `${notesfolder}/${Topicname}/${filename}`,
      await res.blob()
    );
    return filename;
  } catch (err) {
    console.error(err);
    return null;
  }
}
console.log(`Listening on http://localhost:${server.port} ...`);
