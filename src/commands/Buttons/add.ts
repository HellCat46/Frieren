import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { Params } from "./button.types";
import { embedError } from "../../components/EmbedTemplate";
import { addPage, getPageLink } from "../../components/Requests";
import { randomInt } from "crypto";
import { topicStatus } from "../../shared.types";
import { Frieren } from "../../Frieren";

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
          embedError("Pages can't be added into a Closed or Archived Topic"),
        ],
        ephemeral: true,
      });
      return;
    }
    if (!params.interaction.channel) return;

    const pin = randomInt(111111, 999999);
    let embed = new EmbedBuilder()
      .setTitle("Image Collector")
      .setDescription("You have 2 minute to send all pages you want to add.")
      .setFooter({
        text: `Type \`STOP ${pin}\` to end collector immediately.`,
      });

    await params.interaction.deferReply();
    await params.interaction.followUp({ embeds: [embed] });

    const collector = params.interaction.channel.createMessageCollector({
      time: 120000,
    });
    let count = params.topic.page_count;
    collector.on("collect", async (msg) => {
      if (params.interaction.user.id != msg.author.id || !msg.attachments)
        return;
      if (msg.content == `STOP ${pin}`) {
        collector.stop("Requested by user");
        msg.delete();
        return;
      }

      for (const attachment of msg.attachments) {
        const res = await addPage(
          client.dbPool,
          params.topic.id,
          attachment[1].url
        );

        if (res instanceof Error) {
          await params.interaction.followUp({
            embeds: [embedError(res.message)],
            ephemeral: true,
          });
          return;
        }
        count = res;
      }
      msg.delete();
    });

    collector.on("end", async (items) => {
      await params.interaction.deleteReply();
      await params.interaction.followUp({
        embeds: [embed.setDescription("Timer Ended").setFooter(null)],
        ephemeral: true,
      });
      if (items.size <= 1) return;

      client.Topics.set(params.topic.id, {
        name: params.topic.name,
        page_count: count,
        status: params.topic.status,
        archive_link: params.topic.archive_link,
      });

      const path = await getPageLink(client.dbPool, params.topic.id, 1);
      if (path instanceof Error) {
        await params.interaction.editReply({
          embeds: [embedError(path.message)],
        });
        return;
      }

      await params.interaction.message.edit({
        embeds: [
          EmbedBuilder.from(params.embed)
            .setImage(`attachment://${path.split("/").at(-1)}`)
            .setFooter({
              text: `${1} of ${count}`,
            }),
        ],
        components: params.interaction.message.components,
        files: [new AttachmentBuilder(path)],
      });
    });
  },
};
