import { AudioPlayer } from "@discordjs/voice";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Collection } from "discord.js";
import { Pool } from "pg";

declare module "discord.js" {
  export interface Client {
    genAI: GoogleGenerativeAI;
    commands: Collection<any, any>;
    buttons: Collection<any, any>;
    music: {
      loop: boolean;
      queue: Music[];
      player: AudioPlayer;
    };
    dbPool: Pool;
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

interface Music {
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
