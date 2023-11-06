import { Collection } from "discord.js";

export async function createTopic(
  apiurl : string,
  topicName: string,
  pageurl?: string
): Promise<{ id: number; msg: string }> {
  if (!pageurl) pageurl = "";
  try {
    const res = await fetch(
      `http://${apiurl}/create?name=${topicName}&pageurl=${pageurl}`,
      { method: "POST" }
    );
    if (res.status == 200) {
      const json: { id: number } = await res.json();
      return { id: json.id, msg: "" };
    } else {
      const json: { error: string } = await res.json();
      return { id: -1, msg: json.error };
    }
  } catch (err) {
    console.error(err);
    return { id: -1, msg: `${err}` };
  }
}

export async function addPage(
  apiurl: string,
  id: number,
  pageurl: string
): Promise<number | string> {
  try {
    const res = await fetch(
      `http://${apiurl}/addpage?id=${id}&pageurl=${pageurl}`,
      { method: "PATCH" }
    );
    if (res.status == 200) {
      const json: { page_count: number } = await res.json();
      return json.page_count;
    } else {
      console.error(res.status);
      return `${res.status}`;
    }
  } catch (err) {
    console.error(err);
    return `${err}`;
  }
}

export async function getPageLink(
  apiurl: string,
  topicId: number,
  pageno: number
): Promise<string> {
  try {
    const res = await fetch(
      `http://${apiurl}/getpage?id=${topicId}&pageno=${pageno}`
    );
    if (res.status == 200) {
      const json: { link: string } = await res.json();
      return json.link;
    } else {
      const json: { error: string } = await res.json();
      throw json.error;
    }
  } catch (err) {
    console.error(err);
    return `${err}`;
  }
}

export async function removePage(
  apiurl: string,
  topicId: number,
  pageno: string
): Promise<number | string> {
  try {
    const res = await fetch(
      `http://${apiurl}/removepage?id=${topicId}&pageno=${pageno}`,
      { method: "DELETE" }
    );
    if (res.status == 200) {
      return 0;
    } else {
      return res.status;
    }
  } catch (err) {
    console.error(err);
    return `${err}`;
  }
}

export async function getTopics(
  apiurl: string
): Promise<Collection<number, { name: string; page_count: number }>> {
  console.log(apiurl);
  const res = await fetch(`http://${apiurl}/listtopic`);
  let collection: Collection<number, { name: string; page_count: number }> =
    new Collection();
  if (res.status == 200) {
    const json: { list: { id: number; name: string; page_count: number }[] } =
      await res.json();
    json.list.forEach((topic) => {
      collection.set(topic.id, {
        name: topic.name,
        page_count: topic.page_count,
      });
    });
    return collection;
  } else {
    return new Collection();
  }
}
