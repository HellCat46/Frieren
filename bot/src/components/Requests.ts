import { Collection } from "discord.js";
import { topicStatus } from "../index";

export async function createTopic(
  apiurl: string,
  topicName: string,
  pageurl?: string
): Promise<{ id: number; msg: string }> {
  if (!pageurl) pageurl = "";
  try {
    const res = await fetch(
      `${apiurl}/create?name=${topicName}&pageurl=${pageurl}`,
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
      `${apiurl}/addpage?id=${id}&pageurl=${pageurl}`,
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
  file_router : string,
  topicId: number,
  pageno: number
): Promise<string> {
  try {
    const res = await fetch(
      `${apiurl}/getpage?id=${topicId}&pageno=${pageno}`
    );
    if (res.status == 200) {
      const json: { path: string } = await res.json();
      return file_router+json.path;
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
      `${apiurl}/removepage?id=${topicId}&pageno=${pageno}`,
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
  apiurl: string,
  file_router : string
): Promise<Collection<number, { name: string; page_count: number; status : topicStatus; archive_link : string | null }>> {
  const res = await fetch(`${apiurl}/listtopic`);
  let collection: Collection<
    number,
    {
      name: string;
      page_count: number;
      status: topicStatus;
      archive_link: string | null;
    }
  > = new Collection();
  if (res.status == 200) {
    const json: {
      list: {
        _id: number;
        _name: string;
        _status: topicStatus;
        archive_path: string | null;
        page_count: number;
      }[];
    } = await res.json();
    json.list.forEach((topic) => {
      if (topic.page_count == null) topic.page_count = 0;
      collection.set(topic._id, {
        name: topic._name,
        page_count: topic.page_count,
        status : topic._status,
        archive_link : topic.archive_path? file_router + topic.archive_path : null
      });
    });
    return collection;
  } else {
    return new Collection();
  }
}

export async function deleteTopic(
  apiurl: string,
  topicId: number
): Promise<boolean> {
  try {
    const res = await fetch(`${apiurl}/deletetopic?id=${topicId}`, {method : "DELETE"});
    if (res.status == 200) {
      return true;
    } else {
      const json: { error: string } = await res.json();
      throw json;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}


export async function changeStatus(
  apiurl : string,
  topicId: number,
  status: topicStatus
): Promise<boolean | string> {
  try {
    const res = await fetch(`${apiurl}/changeStatus?id=${topicId}&status=${status}`, {method : "PATCH"});
    if (res.status == 200) {
      if(status == topicStatus.Archived){
        const json : {path : string} = await res.json();
        return json.path;
      }
      return true;
    }else {
      const json : {error : string} = await res.json();
      throw json.error;
    }
  }catch(err) {
    console.error(err);
    return false;
  }
}
