import { Collection } from "discord.js";
import { Pool } from "pg";
import { archivefolder, createArchive, createTopicFolder, deletePage, deleteTopicFolder, notesfolder, saveFile } from "./ManageFiles";
import { TopicData, topicStatus } from "../Frieren";

const status = ["Open", "Closed", "Archived"];

export async function createTopic(
  pool: Pool,
  topicName: string,
  pageurl?: string
): Promise<number | Error> {
  const apiurl = "";

  if (!pageurl) pageurl = "";
  try {
    if (
      (
        await pool.query(
          `SELECT COUNT(*) FROM topic where topic._name = '${topicName}';`
        )
      ).rows[0].count > 0
    ) {
      return new Error("Topic already exist with this name");
    }

    const id: number = (
      await pool.query(
        `INSERT INTO topic(_name, _status, "_pagePaths")  VALUES('${topicName}', '${status[0]}', '{}') RETURNING topic._id;`
      )
    ).rows[0]._id;

    createTopicFolder(id).catch(async (err) => {
      if (err) {
        await pool.query(`DELETE FROM topic WHERE topic._id = ${id};`);
        throw err;
      }
    });
    if (!pageurl) return id;


    const result = await saveFile(id, [], pageurl);
    if (result instanceof Error) throw result;

    await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${id};`
    );
    return id;
  } catch (err) {
    console.error(err);

    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function addPage(
  pool: Pool,
  topicId: number,
  pageurl: string
): Promise<number | Error> {
  try {
    const records = await pool.query(
      `SELECT "_pagePaths" FROM topic WHERE topic._id = ${topicId};`
    );
    if (records.rows.length == 0) return new Error("Topic doesn't exist.");

    const result = await saveFile(topicId, records.rows[0]._pagePaths, pageurl);
    if (result instanceof Error) throw result;

    const updates = await pool.query(
      `UPDATE public.topic SET "_pagePaths" = array_append(topic."_pagePaths", '${result}') WHERE topic._id = ${topicId} RETURNING ARRAY_LENGTH(topic."_pagePaths", 1);`
    );
    return updates.rows[0].array_length;
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function getPageLink(
  pool: Pool,
  topicId: number,
  pageno: number
): Promise<string | Error> {
  try {
    const result = await pool.query(
      `SELECT "_pagePaths"[${+pageno}] AS "pagePath" FROM topic WHERE _id = ${topicId};`
    );
    if (result.rows[0].pagePath == null) return new Error("Page doesn't exists.");

    return `${notesfolder}/${topicId}/${result.rows[0].pagePath}`;
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function removePage(
  pool: Pool,
  topicId: number,
  pageno: string
): Promise<void | Error> {
  try {
    const records = await pool.query(
      `SELECT "_pagePaths" FROM topic WHERE _id = ${topicId};`
    );
    if (records.rows.length == 0) return new Error("Topic doesn't exist.");
    else if (records.rows[0]._pagePaths.length == 0) return new Error("Zero Pages in the topic.")
      

    const page = records.rows[0]._pagePaths[+pageno - 1];

    let paths: Array<string> = records.rows[0]._pagePaths.filter((path : string) => page != path);

    await deletePage(topicId, page)

    await pool.query(
      `UPDATE topic SET "_pagePaths" = '{${paths.toString()}}'
       WHERE _id = ${topicId};`
    );
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function changeStatus(
  pool: Pool,
  topicId: number,
  status: topicStatus
): Promise<string | Error> {
  try {
    if (status === topicStatus.Archived) {
      const records = await pool.query(
        `SELECT "_pagePaths" as page_paths from topic WHERE _id = ${topicId};`
      );
      if(records.rows[0].page_paths.length === 0 ) return new Error("Empty Topic can't be archived. Either Delete or Close it");

      const path = await createArchive(topicId, records.rows[0].page_paths);
      if (path instanceof Error) return new Error("Unable to Create an Archive.");

      const result = await pool.query(
        `UPDATE topic SET _status = '${topicStatus[status]}', "_archivePath" = '${archivefolder}/${path}' WHERE _id = ${topicId};`
      );
      if (result.rowCount == 0) return new Error("Topic doesn't exist.");

      return `${archivefolder}/${path}`;
    }

    const result = await pool.query(
      `UPDATE topic SET _status = '${topicStatus[status]}' WHERE _id = ${topicId};`
    );
    if (result.rowCount == 0) return new Error("Topic doesn't exist.");

    return "";
  } catch (err) {
    console.error(err);
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function deleteTopic(
  pool: Pool,
  topicId: number
): Promise<boolean | Error> {
  const apiurl = "";
  try {
    deleteTopicFolder(topicId);
    const result = await pool.query(`DELETE FROM topic WHERE _id = ${topicId};`);
    if (result.rowCount == 0) {
      return new Error("Topic doesn't exists.")
    }

    return true;
  } catch (err) {
    console.error(err);
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function getTopics(
  pool: Pool,
): Promise<Collection<
  number,
  {
    name: string;
    page_count: number;
    status: topicStatus;
    archive_link: string | null;
  }
>> {
  const records = await pool.query(
    `SELECT _id, _name, _status, "_archivePath" as archive_path, ARRAY_LENGTH("_pagePaths",1) AS page_count FROM topic;`
  );
  const list: {
    _id: number;
    _name: string;
    _status: topicStatus;
    archive_path: string | null;
    page_count: number;
  }[] = records.rows.map((item) => {
    item._status = status.indexOf(item._status);
    return item;
  });

  let collection: Collection<
    number,
    TopicData
  > = new Collection();

  for (let idx = 0; idx < list.length; idx++) {
    if (list[idx].page_count == null) list[idx].page_count = 0;
    collection.set(list[idx]._id, {
      name: list[idx]._name,
      page_count: list[idx].page_count,
      status: list[idx]._status,
      archive_link: list[idx].archive_path
    });
  };
  return collection;
}
