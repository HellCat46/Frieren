import { Collection } from "discord.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<any, any>;
    Topics : Collection<number, {name : string, page_count : number}>
  }
}
