import { ButtonInteraction, Embed } from "discord.js";
import { topicStatus } from "../../Frieren";

export interface Params {
  interaction: ButtonInteraction;
  embed: Embed;
  topic: {
    id: number;
    name: string;
    page_count: number;
    status: topicStatus;
    archive_link: string | null;
  };
}
