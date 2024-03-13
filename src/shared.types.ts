export enum topicStatus {
  Open,
  Closed,
  Archived,
}
export interface Music {
  title: string;
  url: string;
  thumbnail: string | undefined;
  length: number;
  author: {
    name: string;
    url: string;
  };
  channel: string;
  guild: string;
}
