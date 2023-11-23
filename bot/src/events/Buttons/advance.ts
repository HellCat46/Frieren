import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { changeStatus, deleteTopic } from "../../components/Requests";
import { topicStatus } from "../../shared.types";
import { Params } from "./button.types";

module.exports = {
  async execute(params: Params) {
    await params.interaction.deferReply({ ephemeral: true });
    let link_button = new ButtonBuilder()
      .setLabel("PDF Link")
      .setStyle(ButtonStyle.Link)
      .setURL("https://youtu.be/dQw4w9WgXcQ?si=n1_Z0PYpWv6U75J4");
    if (params.topic.archive_link != null) {
      link_button.setURL(params.topic.archive_link);
    } else {
      link_button.setDisabled(true);
    }

    const click = await (
      await params.interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Advance Options")
            .setDescription(
              "These options are only available for limited users."
            )
            .setThumbnail(
              "https://cdn.discordapp.com/attachments/1067033740154519612/1171085332565995630/memed-io-output.jpeg"
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Open")
              .setCustomId("open")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setLabel("Close")
              .setCustomId("close")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel("Delete")
              .setCustomId("delete")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setLabel("Archive")
              .setCustomId("archive")
              .setStyle(ButtonStyle.Danger),
            link_button
          ),
        ],
      })
    )
      .awaitMessageComponent({
        filter: (click) => click.user.id == params.interaction.user.id,
        time: 20000,
        componentType: ComponentType.Button,
      })
      .then((value) => value)
      .catch(() => null);

    await params.interaction.deleteReply();
    if (click == null) return;

    if (params.topic.status == topicStatus.Archived) {
      await click.reply({
        content:
          "Topic is archived therefore these options are not accessible.",
        ephemeral: true,
      });
      return;
    }

    await click.deferReply({ ephemeral: true });
    switch (click.customId) {
      case "open":
        {
          if (params.topic.status == topicStatus.Open) {
            await click.editReply({
              embeds: [embedError("Topic is already opened")],
            });
            return;
          }

          const result = await changeStatus(
            click.client.api_url,
            params.topic.id,
            topicStatus.Open
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          click.client.Topics.set(params.topic.id, {
            name: params.topic.name,
            page_count: params.topic.page_count,
            status: topicStatus.Open,
            archive_link: params.topic.archive_link,
          });
          click.editReply("Successfully opened the Topic.");
        }
        break;
      case "close":
        {
          if (params.topic.status == topicStatus.Closed) {
            await click.editReply({
              embeds: [embedError("Topic is already closed")],
            });
            return;
          }

          const result = await changeStatus(
            click.client.api_url,
            params.topic.id,
            topicStatus.Closed
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          click.client.Topics.set(params.topic.id, {
            name: params.topic.name,
            page_count: params.topic.page_count,
            status: topicStatus.Closed,
            archive_link: params.topic.archive_link,
          });
          click.editReply("Successfully Closed the Topic.");
        }
        break;
      case "archive":
        {
          const result = await changeStatus(
            click.client.api_url,
            params.topic.id,
            topicStatus.Archived
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          click.client.Topics.set(params.topic.id, {
            name: params.topic.name,
            page_count: params.topic.page_count,
            status: topicStatus.Archived,
            archive_link: params.interaction.client.file_router + result,
          });
          click.editReply(
            `Successfully Archive the Topic. PDF Link : ${
              params.interaction.client.file_router + result
            }`
          );
        }
        break;
      case "delete":
        {
          const result = await deleteTopic(
            click.client.api_url,
            params.topic.id
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          click.client.Topics.delete(params.topic.id);
          click.editReply("Successfully Deleted the Topic.");
          params.interaction.message.delete();
        }
        break;
    }
  },
};
