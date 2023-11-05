import * as schema from "./db/schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { topic } from "./db/schema";
import { Table, eq, not } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mkdir, mkdirSync, unlink } from "node:fs";
import dotenv from "dotenv";
dotenv.config();

const pClient = postgres(process.env.CONSTR!, { max: 100 });
const db = drizzle(pClient, { schema });

const notesfolder = "files/notes";
const archivefolder = "files/archive";

mkdirSync(notesfolder, { recursive: true });
mkdirSync(archivefolder, { recursive: true });

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Checks for all the endpoints
    if (url.pathname == "/") return Root(req.method);
    else if (url.pathname == "/listtopic") return ListTopics(req.method);
    else if (url.pathname == "/getpage") return GetPage(req.method, url);
    else if (url.pathname == "/create") return CreateTopic(req.method, url);
    else if (url.pathname == "/addpage") return AddPage(req.method, url);
    else if (url.pathname == "/removepage") return RemovePage(req.method, url);
    else if (url.pathname == "/chngstatus")
      return ChangeStatus(req.method, url);
    else if (url.pathname.startsWith("/files"))
      return FileRouter(req.method, url.pathname);
    else return new Response("", { status: 404 });
  },
});

function Root(reqmethod: string) {
  return new Response(JSON.stringify({ message: "Hello" }));
}

// Returns List of topic with only topic's id and name
async function ListTopics(reqmethod: string) {
  if (reqmethod != "GET")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });

  try {
    // Gets all the topics except archived ones
    const records = await db
      .select({
        id: topic.id,
        name: topic.name,
        pagePaths: topic.pagePaths,
      })
      .from(topic)
      .where(not(eq(topic.status, schema.StatusEnum.enumValues[2])));
    
    
    return new Response(
      JSON.stringify({
        list: records.map((record) => new Object({id : record.id, name : record.name, page_count : record.pagePaths.length})
        ),
      })
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

// Returns the image url of given page no
async function GetPage(reqmethod: string, url: URL) {
  if (reqmethod != "GET")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    }); // Check for proper http method

  const id = url.searchParams.get("id");
  const page = url.searchParams.get("pageno");
  if (!id || !page)
    return new Response(
      JSON.stringify({ error: "Missing or empty required query string" }),
      {
        status: 400,
      }
    );

  try {
    const pageno = +page;
    const result = await db
      .select({ pagePaths: topic.pagePaths })
      .from(topic)
      .where(eq(topic.id, +id));

    if (result.length == 0)
      return new Response(JSON.stringify({ error: "Topic doesn't exist." }), {
        status: 204,
      });
    else if (result[0].pagePaths.length == 0)
      return new Response(
        JSON.stringify({ error: "Zero pages for the topic" }),
        { status: 204 }
      );
    else if (pageno <= 0 || result[0].pagePaths.length < pageno)
      return new Response(JSON.stringify({ error: "Page doesn't exist" }), {
        status: 204,
      });

    return new Response(
      JSON.stringify({
        link: `http://${url.hostname}:${url.port}/files/notes/${id}/${
          result[0].pagePaths[pageno - 1]
        }`,
      })
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

// Creates a new topic in database and returns it's id
// Also creates a folder in "files" directory to save Topic's notes
async function CreateTopic(reqmethod: string, url: URL) {
  if (reqmethod != "POST")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    }); // Check for proper http method

  const name = url.searchParams.get("name");
  const pageurl = url.searchParams.get("pageurl");
  if (!name)
    return new Response(
      JSON.stringify({ error: "Missing or empty required query string" }),
      {
        status: 400,
      }
    );

  try {
    if ((await db.select({id : topic.id}).from(topic).where(eq(topic.name, name))).length > 0)
      return new Response(
        JSON.stringify({ error: "Topic already exist with this name" }),
        {
          status: 409,
        }
      );

    const id = (
      await db
        .insert(topic)
        .values({
          name,
          status: schema.StatusEnum.enumValues[0],
          pagePaths: [],
        })
        .returning({ id: topic.id })
    )[0].id;
    mkdir(`${notesfolder}/${id}`, async (err) => {
      if (err) {
        await db.delete(topic).where(eq(topic.id, id));
        throw err;
      }
    });
    if (!pageurl) return new Response(JSON.stringify({ id }));

    const result = await saveFile(id, [], pageurl);
    if (result == null)
      return new Response(
        JSON.stringify({ err: "Error while saving the file" }),
        { status: 500 }
      );

    await db.update(topic).set({ pagePaths: [result] });
    return new Response(JSON.stringify({ id }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

// Adds more pages to already created topic
// Returns total number of pages for the topic
async function AddPage(reqmethod: string, url: URL) {
  if (reqmethod != "PATCH")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });

  const id = url.searchParams.get("id");
  const pageurl = url.searchParams.get("pageurl");
  if (!id || !pageurl) {
    return new Response(
      JSON.stringify({ error: "Missing or empty required query string" }),
      {
        status: 400,
      }
    );
  }

  try {
    const records = await db
      .select({ pagePaths: topic.pagePaths })
      .from(topic)
      .where(eq(topic.id, +id));
    if (records.length == 0)
      return new Response(JSON.stringify({ error: "Topic doesn't exist." }), {
        status: 204,
      });

    const result = await saveFile(+id, records[0].pagePaths, pageurl);
    if (result == null)
      return new Response(
        JSON.stringify({ err: "Error while saving the file" }),
        { status: 500 }
      );

    const arr = [...records[0].pagePaths, result];

    await db.update(topic).set({ pagePaths: arr }).where(eq(topic.id, +id));

    return new Response(JSON.stringify({ page_count: arr.length }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

// Remove a page from the topic records
async function RemovePage(reqmethod: string, url: URL) {
  if (reqmethod != "DELETE")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });

  const id = url.searchParams.get("id");
  const pageno = url.searchParams.get("pageno");
  if (!id || !pageno)
    return new Response(
      JSON.stringify({ error: "Missing or empty required query string" }),
      {
        status: 400,
      }
    );

  try {
    const result = await db
      .select({ pagePaths: topic.pagePaths })
      .from(topic)
      .where(eq(topic.id, +id));
    if (result.length == 0)
      return new Response(JSON.stringify({ error: "Topic doesn't exist." }), {
        status: 204,
      });
    else if (result[0].pagePaths.length == 0)
      return new Response(
        JSON.stringify({ error: "Zero pages for the topic" }),
        { status: 204 }
      );

    const page = result[0].pagePaths[+pageno - 1];

    unlink(`${notesfolder}/${id}/${page}`, (err) => {
      if (err)
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
        });
    });

    await db
      .update(topic)
      .set({ pagePaths: result[0].pagePaths.filter((pname) => pname != page) })
      .where(eq(topic.id, +id));

    return new Response("");
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

/*
Change status of topic
Closed will not allow adding more pages
Archive will create a pdf from all the topic's page and return it
*/
function ChangeStatus(reqmethod: string, url: URL) {
  if (reqmethod != "PATCH")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });

  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (!id || !status)
    return new Response(
      JSON.stringify({ error: "Missing or empty required query string" }),
      {
        status: 400,
      }
    );

  return new Response();
}

async function FileRouter(reqmethod: string, path: string) {
  if (reqmethod != "GET")
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });

  return new Response(Bun.file(path.substring(1, path.length)));
}

async function saveFile(TopicId: number, filelist: string[], downurl: string) {
  // Looks for Unique name for file
  const filename = randomUUID() + ".png";
  filelist.forEach((file) => {
    if (file == filename) {
      return saveFile(TopicId, filelist, downurl);
    }
  });

  try {
    const res = await fetch(downurl);
    const contenttype = res.headers.get("content-type");

    if (!contenttype) return null;
    if (!contenttype.startsWith("image")) return null;

    await Bun.write(`${notesfolder}/${TopicId}/${filename}`, await res.blob());
    return filename;
  } catch (err) {
    console.error(err);
    return null;
  }
}
console.log(`Listening on http://${server.hostname}:${server.port} ...`);
