import { Collection } from "discord.js";
import { Pool } from "pg";

declare module "discord.js" {
  export interface Client {
    commands: Collection<any, any>;
    buttons: Collection<any, any>;
    dbPool : Pool;
    Topics: Collection<
      number,
      {
        name: string;
        page_count: number;
        status: topicStatus;
        archive_link: string | null;
      }
    >;
  }
}