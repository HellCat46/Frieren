import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandAttachmentOption,
} from "discord.js";
import { createTopic, getPageLink } from "../components/Requests";
import { embedError, embedTopic } from "../components/EmbedTemplate";
import { topicStatus } from "../shared.types";

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
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const topicName = interaction.options.getString("name", true);
    const page = interaction.options.getAttachment("notes");
    let res: { id: number; msg: string };

    if (!page) {
      res = await createTopic(interaction.client.api_url, topicName);
      if (res.id == -1) {
        await interaction.editReply({ embeds: [embedError(res.msg)] });
      } else {
        const message = embedTopic({ id: res.id, topicName });
        interaction.options.client.Topics.set(res.id, {
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

    res = await createTopic(interaction.client.api_url, topicName, page.url);
    if (res.id == -1) {
      await interaction.editReply({ embeds: [embedError(res.msg)] });
      return;
    }

    const link = await getPageLink(
      interaction.client.api_url,
      interaction.client.file_router,
      +res.id,
      1
    );
    if (link instanceof Error) {
      await interaction.editReply({
        content: link.message,
      });
      return;
    }
    const message = embedTopic({
      id: res.id,
      topicName,
      footer: "1 of 1",
      pageurl: link,
    });
    interaction.options.client.Topics.set(res.id, {
      name: topicName,
      page_count: 1,
      status: topicStatus.Open,
      archive_link: null,
    });

    await interaction.editReply({
      embeds: [message.embed],
      components: message.rows,
    });
  },
};
