import { Collection } from "discord.js";
import { topicStatus } from "../shared.types";

export async function createTopic(
  apiurl: string,
  topicName: string,
  pageurl?: string
): Promise<number | Error> {
  if (!pageurl) pageurl = "";
  try {
    const res = await fetch(
      `${apiurl}/create?name=${topicName}&pageurl=${pageurl}`,
      { method: "POST" }
    );
    if (res.status == 200) {
      const json: { id: number } = await res.json();
      return json.id;
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;

    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function addPage(
  apiurl: string,
  id: number,
  pageurl: string
): Promise<number | Error> {
  try {
    const res = await fetch(`${apiurl}/addpage?id=${id}&pageurl=${pageurl}`, {
      method: "PATCH",
    });
    if (res.status == 200) {
      const json: { page_count: number } = await res.json();
      return json.page_count;
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function getPageLink(
  apiurl: string,
  file_router: string,
  topicId: number,
  pageno: number
): Promise<string | Error> {
  try {
    const res = await fetch(`${apiurl}/getpage?id=${topicId}&pageno=${pageno}`);
    if (res.status == 200) {
      const json: { path: string } = await res.json();
      return file_router + json.path;
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function removePage(
  apiurl: string,
  topicId: number,
  pageno: string
): Promise<boolean | Error> {
  try {
    const res = await fetch(
      `${apiurl}/removepage?id=${topicId}&pageno=${pageno}`,
      { method: "DELETE" }
    );
    if (res.status == 200) {
      return true;
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function changeStatus(
  apiurl: string,
  topicId: number,
  status: topicStatus
): Promise<string | Error> {
  try {
    const res = await fetch(
      `${apiurl}/changeStatus?id=${topicId}&status=${status}`,
      { method: "PATCH" }
    );
    if (res.status == 200) {
      if (status == topicStatus.Archived) {
        const json: { path: string } = await res.json();
        return json.path;
      }
      return "";
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export async function deleteTopic(
  apiurl: string,
  topicId: number
): Promise<boolean | Error> {
  try {
    const res = await fetch(`${apiurl}/deletetopic?id=${topicId}`, {
      method: "DELETE",
    });
    if (res.status == 200) {
      return true;
    } else {
      const json: { error: string } = await res.json();
      throw new Error(json.error);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) return err;
    return new Error(
      "An unexpected error occurred while sending a request to the API."
    );
  }
}

export function getTopics(
  apiurl: string,
  file_router: string
): Collection<
  number,
  {
    name: string;
    page_count: number;
    status: topicStatus;
    archive_link: string | null;
  }
> {
  let collection: Collection<
    number,
    {
      name: string;
      page_count: number;
      status: topicStatus;
      archive_link: string | null;
    }
  > = new Collection();

  fetch(`${apiurl}/listtopic`)
    .then((res) => {
      if (res.status == 200) return res.json();
      console.error(res);
      throw new Error("Something went wrong");
    })
    .then(
      (json: {
        list: {
          _id: number;
          _name: string;
          _status: topicStatus;
          archive_path: string | null;
          page_count: number;
        }[];
      }) => {
        json.list.forEach((topic) => {
          if (topic.page_count == null) topic.page_count = 0;
          collection.set(topic._id, {
            name: topic._name,
            page_count: topic.page_count,
            status: topic._status,
            archive_link: topic.archive_path
              ? file_router + topic.archive_path
              : null,
          });
        });
      }
    )
    .catch((err) => {
      console.error(err);
      throw new Error();
    });
  return collection;
}
