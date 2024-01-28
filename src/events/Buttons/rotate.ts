import { AttachmentBuilder } from "discord.js";
import { Params } from "./button.types";
import { embedError, embedTopic } from "../../components/EmbedTemplate";
import { getPageLink } from "../../components/Requests";
import { topicStatus } from "../../shared.types";
import Jimp from "jimp";

module.exports = {
  async execute(params: Params) {
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
    if (!params.embed.footer) {
      await params.interaction.reply({
        embeds: [embedError("No Image to Rotate.")],
        ephemeral: true,
      });
      return;
    }

    await params.interaction.deferReply({ ephemeral: true });

    const activePage = +params.embed.footer.text.split(" ")[0];
    const path = await getPageLink(
      params.interaction.client.dbPool,
      params.topic.id,
      activePage
    );
    if (path instanceof Error) {
      await params.interaction.editReply({
        embeds: [embedError("Unable to Get Active Page Information.")],
      });
      return;
    }

    const image = await Jimp.read(path);
    image.rotate(90);
    await image.writeAsync(path);

    const msg = embedTopic({
      id: params.topic.id,
      topicName: params.topic.name,
      footer: `${activePage} of ${params.topic.page_count}`,
      pageurl: `attachment://${path.split("/").at(-1)}`,
    });

    await params.interaction.message.edit({
      embeds: [msg.embed],
      components: msg.rows,
      files: [new AttachmentBuilder(path)],
    });
    await params.interaction.editReply({
      content: "Successfully Rotated the Active Page.",
    });
  },
};
