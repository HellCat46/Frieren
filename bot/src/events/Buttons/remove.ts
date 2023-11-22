import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { Params } from "./button.types";
import { getPageLink, removePage } from "../../components/Requests";
import { topicStatus } from "../../shared.types";

module.exports = {
  async execute(params: Params) {
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
      params.interaction.client.api_url,
      params.topic.id,
      pageno
    );
    if (res != 0) {
      await params.interaction.followUp({
        embeds: [embedError(`${res}`)],
        ephemeral: true,
      });
      return;
    }

    params.topic.page_count--;
    params.interaction.client.Topics.set(params.topic.id, {
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

    const link = await getPageLink(
      params.interaction.client.api_url,
      params.interaction.client.file_router,
      params.topic.id,
      +pageno
    );

    if (link instanceof Error) {
      await params.interaction.followUp({
        embeds: [embedError(link.message)],
      });
      return;
    }

    await params.interaction.message.edit({
      embeds: [
        EmbedBuilder.from(params.embed)
          .setImage(link)
          .setFooter({
            text: `${pageno} of ${params.topic.page_count}`,
          }),
      ],
      components: params.interaction.message.components,
    });
  },
};
