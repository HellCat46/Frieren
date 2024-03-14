import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { Params } from "./button.types";
import { getPageLink, removePage } from "../../components/Requests";
import { Frieren, topicStatus } from "../../Frieren";

module.exports = {
  async execute(client: Frieren, params: Params) {
    if (!params.interaction.memberPermissions?.has("ManageMessages")) {
      await params.interaction.reply({
        embeds: [
          embedError("You don't have permission to perform this action."),
        ],
        ephemeral: true,
      });
      return;
    }

    if (params.topic.status != topicStatus.Open) {
      await params.interaction.reply({
        embeds: [
          embedError("Pages can't be removed from a Closed or Archived Topic"),
        ],
        ephemeral: true,
      });
      return;
    }
    await params.interaction.deferReply();

    if (!params.embed.footer || params.topic.page_count == 0) {
      await params.interaction.followUp({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }

    const input = await (
      await params.interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Deletion Confirmation")
            .setDescription(
              "Do you really want to delete the currently active page?"
            )
            .setFooter({
              text: "Confirmation will expire after 20 seconds",
            }),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Yes")
              .setCustomId("yes")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setLabel("No")
              .setCustomId("no")
              .setStyle(ButtonStyle.Success)
          ),
        ],
      })
    )
      .awaitMessageComponent({
        filter: (click) => click.user.id == params.interaction.user.id,
        time: 20000,
        componentType: ComponentType.Button,
      })
      .then((value) => {
        if (value.customId == "yes") return 1;
        else return 0;
      })
      .catch(() => 0);

    await params.interaction.deleteReply();
    if (input == 0) {
      return;
    }

    const pageno = params.embed.footer.text.split(" ")[0];
    const res = await removePage(
      client.dbPool,
      params.topic.id,
      pageno
    );
    if (res instanceof Error) {
      await params.interaction.followUp({
        embeds: [embedError(res.message)],
        ephemeral: true,
      });
      return;
    }

    params.topic.page_count--;
    client.Topics.set(params.topic.id, {
      name: params.topic.name,
      page_count: params.topic.page_count,
      status: params.topic.status,
      archive_link: params.topic.archive_link,
    });

    if (params.topic.page_count == 0) {
      await params.interaction.message.edit({
        embeds: [
          EmbedBuilder.from(params.embed).setImage(null).setFooter(null),
        ],
        components: [params.interaction.message.components[1]],
      });
      return;
    }

    const path = await getPageLink(
      client.dbPool,
      params.topic.id,
      +pageno
    );

    if (path instanceof Error) {
      await params.interaction.followUp({
        embeds: [embedError(path.message)],
      });
      return;
    }

    await params.interaction.message.edit({
      embeds: [
        EmbedBuilder.from(params.embed)
          .setImage(`attachment://${path.split("/").at(-1)}`)
          .setFooter({
            text: `${pageno} of ${params.topic.page_count}`,
          }),
      ],
      components: params.interaction.message.components,
      files: [new AttachmentBuilder(path)],
    });
  },
};
