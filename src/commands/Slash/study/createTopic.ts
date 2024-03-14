import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandAttachmentOption,
  AttachmentBuilder,
} from "discord.js";
import { createTopic, getPageLink } from "../../../components/Requests";
import { embedError, embedTopic } from "../../../components/EmbedTemplate";
import { Frieren, topicStatus } from "../../../Frieren";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createtopic")
    .setDescription("Creates a new topic for notes")
    .addStringOption((options: SlashCommandStringOption) =>
      options
        .setName("name")
        .setDescription("Name of Topic")
        .setMaxLength(50)
        .setRequired(true)
    )
    .addAttachmentOption((options: SlashCommandAttachmentOption) =>
      options
        .setName("notes")
        .setDescription("First Page of Notes")
        .setRequired(false)
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const topicName = interaction.options.getString("name", true);
    const page = interaction.options.getAttachment("notes");
    let res: number | Error;

    if (!page) {
      res = await createTopic(client.dbPool, topicName);
      if (res instanceof Error) {
        await interaction.editReply({ embeds: [embedError(res.message)] });
      } else {
        const message = embedTopic({ id: res, topicName });
        client.Topics.set(res, {
          name: topicName,
          page_count: 0,
          status: topicStatus.Open,
          archive_link: null,
        });
        await interaction.editReply({
          embeds: [message.embed],
          components: message.rows.slice(1),
        });
      }

      return;
    }

    // console.log(page.url);
    res = await createTopic(client.dbPool, topicName, page.url);
    if (res instanceof Error) {
      await interaction.editReply({ embeds: [embedError(res.message)] });
      return;
    }

    const path = await getPageLink(client.dbPool, res, 1);
    if (path instanceof Error) {
      await interaction.editReply({
        embeds: [embedError(path.message)],
      });
      return;
    }

    const file = new AttachmentBuilder(path);
    const message = embedTopic({
      id: res,
      topicName,
      footer: "1 of 1",
      pageurl: `attachment://${path.split("/").at(-1)}`,
    });
    client.Topics.set(res, {
      name: topicName,
      page_count: 1,
      status: topicStatus.Open,
      archive_link: null,
    });

    await interaction.editReply({
      embeds: [message.embed],
      components: message.rows,
      files: [file],
    });
  },
};
