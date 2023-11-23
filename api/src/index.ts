import express, { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, mkdirSync, createWriteStream } from "node:fs";
import { rm, unlink } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";
import dotenv from "dotenv";
import { readFile, readdir } from "fs/promises";
dotenv.config();

const app = express();
const file_router = express();

const pool = new Pool();
const status = ["Open", "Closed", "Archived"];

Initialize({dbpool : pool, app, file_router});

const notesfolder = "files/notes";
const archivefolder = "files/archive";
const accepted_types = ["image/png", "image/jpg", "image/jpeg"];

mkdirSync(notesfolder, { recursive: true });
mkdirSync(archivefolder, { recursive: true });


file_router.get("/", async (_, res) => {
  res.json({ message: "Hello" });
});

app.get("/", async (_, res) => {
  res.json({ message: "Hello" });
});

app.get("/listtopic", async (req: Request, res: Response) => {
  try {
    const records = await pool.query(
      `SELECT _id, _name, _status, "_archivePath" as archive_path, ARRAY_LENGTH("_pagePaths",1) AS page_count FROM topic;`
    );
    res.json({
      list: records.rows.map((item) => {
        item._status = status.indexOf(item._status);
        return item;
      }),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
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
      path: `/files/notes/${id}/${result.rows[0].pagePath}`,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
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
    if (result instanceof Error) throw result;

    await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${id};`
    );
    res.json({ id });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
      return;
    }

    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
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
    if (result instanceof Error) throw result;

    console.log(result);
    const updates = await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${id} RETURNING ARRAY_LENGTH(topic."_pagePaths", 1);`
    );
    res.json({ page_count: updates.rows[0].array_length });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
      return;
    }

    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
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

    await unlink(`${notesfolder}/${id}/${page}`);

    await pool.query(
      `UPDATE topic SET "_pagePaths" = '{${paths.toString()}}'
       WHERE _id = ${id};`
    );
    res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
  }
});

app.patch("/changestatus", async (req: Request, res: Response) => {
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

    if (+statuscode == 2) {
      const records = await pool.query(
        `SELECT "_pagePaths" as page_paths from topic WHERE _id = ${id};`
      );
      const path = await createArchive(+id, records.rows[0].page_paths);
      if (path instanceof Error) throw res;

      const result = await pool.query(
        `UPDATE topic SET _status = '${
          status[+statuscode]
        }', "_archivePath" = '${path}' WHERE _id = ${id};`
      );
      if (result.rowCount == 0) {
        res.status(404).json({ error: "Topic doesn't exist." });
        return;
      }
      res.status(200).json({ path });
      return;
    }

    const result = await pool.query(
      `UPDATE topic SET _status = '${status[+statuscode]}' WHERE _id = ${id};`
    );
    if (result.rowCount == 0) {
      res.status(404).json({ error: "Topic doesn't exist." });
      return;
    }
    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unexpected error while processing the request" });
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
    await rm(`${notesfolder}/${id}`, { recursive: true });
    const result = await pool.query(`DELETE FROM topic WHERE _id = ${id};`);
    if (result.rowCount == 0) {
      res.status(404).json({ error: "Topic doesn't exist." });
      return;
    }
    res.status(200).json({ message: "Topic Deleted" });
  } catch (err) {
    console.error(err);
    res
      .status(200)
      .json({ error: "Unexpected error while processing the request" });
  }
});


async function Initialize(Params: {
  dbpool: Pool;
  app: Express;
  file_router: Express;
}) {
  await Params.dbpool
    .query(
      `DO $$ BEGIN
    CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`
    )
    .then(() => console.log("[Database] Successfully created status Enum."))
    .catch((err) => {
      console.error("[Database] Failed to create status Enum.");
      throw new Error(err);
    });

  await Params.dbpool
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
    .catch((err) => {
      console.error("[Database] Failed to create Table topic.");
      throw new Error(err);
    });

  app.listen(+process.env.APIPORT!, () => {
    console.log(`API is running on http://localhost:${process.env.APIPORT}`);
  });

  file_router.use("/files", express.static("files"));
  file_router.listen(+process.env.FILEPORT!, "0.0.0.0", () => {
    console.log(
      `File Router is running on http://0.0.0.0:${process.env.FILEPORT}`
    );
  });
}

async function saveFile(
  TopicId: number,
  filelist: string[],
  downurl: string
): Promise<string | Error> {
  // Looks for Unique name for file
  const filename = randomUUID();
  filelist.forEach((file) => {
    if (file == filename) {
      return saveFile(TopicId, filelist, downurl);
    }
  });

  try {
    const res = await fetch(downurl);
    const contenttype = res.headers.get("content-type");

    if (!contenttype) return new Error(`Unable to get file type.`);
    if (!accepted_types.includes(contenttype))
      return Error("Only PNG and JPG/JPEG type Images are allowed.");
    createWriteStream(
      `${notesfolder}/${TopicId}/${filename}.${contenttype.split("/")[1]}`
    ).write(new Uint8Array(await res.arrayBuffer()));
    return `${filename}.${contenttype.split("/")[1]}`;
  } catch (err) {
    console.error(err);
    return new Error("Unexpected error while saving the file");
  }
}

async function createArchive(
  id: number,
  images: string[]
): Promise<string | Error> {
  try {
    const pdf = await PDFDocument.create();
    for (let image of images) {
      const bytes = await readFile(`${notesfolder}/${id}/${image}`);

      const pdfImage = image.endsWith("png")
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);

      const page = pdf.addPage([pdfImage.width, pdfImage.height]);
      page.drawImage(pdfImage, {
        width: pdfImage.width,
        height: pdfImage.height,
      });
      continue;
    }
    createWriteStream(`${archivefolder}/${id}.pdf`).write(await pdf.save());
    return `/${archivefolder}/${id}.pdf`;
  } catch (err) {
    console.error(err);
    return new Error("Unexpected error while creating PDF from images.");
  }
}
