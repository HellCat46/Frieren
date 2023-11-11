import express, { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, mkdirSync, unlink, writeFile } from "node:fs";
import { Pool } from "pg";
import { PDFDocument } from "pdf-lib";
import dotenv from "dotenv";
import { createWriteStream } from "fs";
dotenv.config();

const app: Express = express();

const pool = new Pool();
const status = ["Open", "Closed", "Archived"];

const notesfolder = "files/notes";
const archivefolder = "files/archive";

mkdirSync(notesfolder, { recursive: true });
mkdirSync(archivefolder, { recursive: true });

app.get("/", async (_, res) => {
  res.json({ message: "Hello" });
});

app.get("/listtopic", async (req: Request, res: Response) => {
  try {
    const records = await pool.query(
      `SELECT _id, _name, ARRAY_LENGTH("_pagePaths",1) AS "page_count" FROM topic WHERE _status != '${status[2]}';`
    );
    res.json({ list: records.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

app.get("/getpage", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  const pageno = url.searchParams.get("pageno");
  if (!id || !pageno) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT "_pagePaths"[${+pageno}] AS "pagePath" FROM topic WHERE _id = ${id};`
    );
    if (result.rows[0].pagePath == null) {
      res.status(404).json({ error: "Page doesn't exist" });
      return;
    }
    res.json({
      link: `http://${url.hostname}:${url.port}/files/notes/${id}/${result.rows[0].pagePath}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

app.post("/create", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.searchParams.get("name");
  const pageurl = url.searchParams.get("pageurl");
  if (!name) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }

  try {
    if (
      (
        await pool.query(
          `SELECT COUNT(*) FROM topic where topic._name = '${name}';`
        )
      ).rows[0].count > 0
    ) {
      res.status(409).json({ error: "Topic already exist with this name" });
      return;
    }

    const id = (
      await pool.query(
        `INSERT INTO topic(_name, _status, "_pagePaths")  VALUES('${name}', '${status[0]}', '{}') RETURNING topic._id;`
      )
    ).rows[0]._id;

    mkdir(`${notesfolder}/${id}`, async (err) => {
      if (err) {
        await pool.query(`DELETE FROM topic WHERE topic._id = ${id};`);
        throw err;
      }
    });
    if (!pageurl) {
      res.json({ id });
      return;
    }

    const result = await saveFile(id, [], pageurl);
    if (result == null) {
      res.status(500).json({ error: "Error while saving the file" });
      return;
    }
    await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${id};`
    );
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.patch("/addpage", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  const pageurl = url.searchParams.get("pageurl");
  if (!id || !pageurl) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }

  try {
    const records = await pool.query(
      `SELECT "_pagePaths" FROM topic WHERE topic._id = ${id};`
    );
    if (records.rows.length == 0) {
      res.status(404).json({ error: "Topic doesn't exist." });
      return;
    }

    const result = await saveFile(+id, records.rows[0]._pagePaths, pageurl);
    if (result == null) {
      res.status(500).json({ error: "Error while saving the file" });
      return;
    }

    const updates = await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${id} RETURNING ARRAY_LENGTH(topic."_pagePaths", 1);`
    );
    res.json({ page_count: updates.rows[0].array_length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

app.delete("/removepage", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  const pageno = url.searchParams.get("pageno");
  if (!id || !pageno) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }

  try {
    const records = await pool.query(
      `SELECT "_pagePaths" FROM topic WHERE _id = ${id};`
    );
    if (records.rows.length == 0) {
      res.status(404).json({ error: "Topic doesn't exist." });
      return;
    } else if (records.rows[0]._pagePaths.length == 0) {
      res.status(404).json({ error: "Zero pages for the topic." });
      return;
    }

    const page = records.rows[0]._pagePaths[+pageno - 1];

    let paths: Array<string> = [];

    for (let path of records.rows[0]._pagePaths) {
      if (path != page) {
        paths.push(path);
      }
    }

    unlink(`${notesfolder}/${id}/${page}`, (err) => {
      if (err) console.error(err);
    });

    await pool.query(
      `UPDATE topic SET "_pagePaths" = '{${paths.toString()}}'
       WHERE _id = ${id};`
    );
    res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

app.patch("/chngstatus", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  const statuscode = url.searchParams.get("status");
  if (!id || !statuscode) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }

  try {
    if (+statuscode > 2 || 0 > +statuscode) {
      res.status(404).json({ error: "Not a Valid Status" });
      return;
    }

    const result = await pool.query(
      `UPDATE topic SET _status = '${status[+statuscode]}' WHERE _id = ${id};`
    );
    if (result.rowCount == 0) {
      res.status(404).json({ error: "Topic doesn't exist." });
      return;
    }
    res.status(200).json("OK");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

app.delete("/deletetopic", async (req: Request, res: Response) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  if (!id) {
    res.status(400).json({ error: "Missing or empty required query string" });
    return;
  }
  try {
    const result = await pool.query(`DELETE FROM topic WHERE _id = ${id};`);
    if(result.rowCount == 0){
      res.status(404).json({error : "Topic doesn't exist."});
      return;
    }
    res.status(200).json({message : "Topic Deleted"})
  } catch (err) {
    console.error(err);
    res.status(200).json({error : err});
  }
});

app.use("/files", express.static("files"));

app.listen(3000, "0.0.0.0", () => {
  console.log("Listening on http://0.0.0.0:3000");
});

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
    createWriteStream(`${notesfolder}/${TopicId}/${filename}`).write(
      new Uint8Array(await res.arrayBuffer())
    );
    return filename;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function archTopic(id: number) {}
