import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { getPageLink } from "../../components/Requests";
import { Params } from "./button.types";

module.exports = {
  async execute(params: Params) {
    if (!params.embed.footer) {
      await params.interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }

    const pageno = +params.embed.footer.text.split(" ")[0] - 1;
    if (0 >= pageno) {
      await params.interaction.reply({
        embeds: [embedError("You are already looking at first page")],
        ephemeral: true,
      });
      return;
    }

    const path = await getPageLink(
      params.interaction.client.dbPool,
      params.topic.id,
      pageno
    );
    if (path instanceof Error) {
      await params.interaction.reply({
        embeds: [embedError(path.message)],
        ephemeral: true,
      });
      return;
    }
    
    const file = new AttachmentBuilder(path);
    const embed = new EmbedBuilder()
      .setTitle(params.embed.title)
      .setImage(`attachment://${path.split("/").at(-1)}`)
      .setFooter({ text: `${pageno} of ${params.topic.page_count}` });

    await params.interaction.update({
      embeds: [embed],
      components: params.interaction.message.components,
      files : [file]
    });
  },
};
