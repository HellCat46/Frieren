import {
  APIEmbedField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { Music } from "../Frieren";
import { secondsToString } from "./musicPlayer";

export function embedError(message: string) {
  return new EmbedBuilder().setTitle(message).setColor("#FF9494");
}

export function embedTopic(params: {
  id: number;
  topicName: string;
  footer?: string;
  pageurl?: string;
}) {
  let embed = new EmbedBuilder().setTitle(`${params.id}. ${params.topicName}`);

  if (params.footer) embed.setFooter({ text: params.footer });
  if (params.pageurl) embed.setImage(params.pageurl);

  const move = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${params.id}.back`)
      .setLabel("Back")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`${params.id}.select`)
      .setLabel("Enter Page No.")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`${params.id}.forward`)
      .setLabel("Forward")
      .setStyle(ButtonStyle.Primary)
  );

  const manage = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${params.id}.add`)
      .setLabel("Add Page")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`${params.id}.remove`)
      .setLabel("Remove Page")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${params.id}.rotate`)
      .setLabel("Rotate")
      .setStyle(ButtonStyle.Success)
  );

  const advance = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${params.id}.advance`)
      .setLabel("Advance Options")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${params.id}.refresh`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Primary)
  );
  return { embed: embed, rows: [move, manage, advance] };
}

export function songsToEmbedPages(songs: Music[]) {
  const pages: APIEmbedField[][] = [];

  let pageIdx = 0;

  pages[pageIdx] = [];
  for (let idx = 1; idx <= songs.length; idx++) {
    if (idx % 25 === 0) {
      pages[++pageIdx] = [];
    }
    pages[pageIdx].push({
      name: `${idx}.${songs[idx - 1].title}`,
      value: `Song Duration: ${secondsToString(
        songs[idx - 1].length
      )} \n [**Link**](${songs[idx - 1].url})`,
    });
  }
  return pages;
}
