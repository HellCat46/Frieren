import { EmbedBuilder } from "discord.js";
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
    const pageno = +params.embed.footer.text.split(" ")[0] + 1;
    if (params.topic.page_count < pageno) {
      await params.interaction.reply({
        embeds: [embedError("You are already looking at last page")],
        ephemeral: true,
      });
      return;
    }

    const link = await getPageLink(
      params.interaction.client.api_url,
      params.interaction.client.file_router,
      params.topic.id,
      pageno
    );
    if (link instanceof Error) {
      await params.interaction.reply({
        embeds: [embedError(link.message)],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(params.embed.title)
      .setImage(link)
      .setFooter({ text: `${pageno} of ${params.topic.page_count}` });

    await params.interaction.update({
      embeds: [embed],
      components: params.interaction.message.components,
    });
  },
};
