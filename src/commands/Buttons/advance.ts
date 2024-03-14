import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ActionRowBuilder,
  ComponentType,
  AttachmentBuilder,
  Attachment,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { changeStatus, deleteTopic } from "../../components/Requests";
import { Params } from "./button.types";
import { Frieren, topicStatus } from "../../Frieren";

module.exports = {
  async execute(client: Frieren, params: Params) {
    await params.interaction.deferReply({ ephemeral: true });
    if (!params.interaction.memberPermissions?.has("Administrator")) {
      await params.interaction.editReply({
        embeds: [
          embedError("You don't have permission to perform this action."),
        ],
      });
      return;
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
            new ButtonBuilder()
              .setLabel("Get PDF")
              .setCustomId("getPdf")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(params.topic.archive_link == null)
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

    if (params.topic.status == topicStatus.Archived && click.customId !== "getPdf") {
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
            client.dbPool,
            params.topic.id,
            topicStatus.Open
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          client.Topics.set(params.topic.id, {
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
          client.dbPool,
            params.topic.id,
            topicStatus.Closed
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          client.Topics.set(params.topic.id, {
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
            client.dbPool,
            params.topic.id,
            topicStatus.Archived
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          client.Topics.set(params.topic.id, {
            name: params.topic.name,
            page_count: params.topic.page_count,
            status: topicStatus.Archived,
            archive_link: result,
          });
          await click.editReply("Successfully Archived the Topic.");
          await click.followUp({
            files: [new AttachmentBuilder(result)],
            ephemeral : true
          });
        }
        break;
      case "getPdf":
        {
          if (params.topic.archive_link != null)
            await click.editReply({
              files: [new AttachmentBuilder(params.topic.archive_link)],
            });
        }
        break;
      case "delete":
        {
          const result = await deleteTopic(
            client.dbPool,
            params.topic.id
          );
          if (result instanceof Error) {
            await click.editReply({
              embeds: [embedError(result.message)],
            });
            return;
          }
          client.Topics.delete(params.topic.id);
          click.editReply("Successfully Deleted the Topic.");
          params.interaction.message.delete();
        }
        break;
    }
  },
};
