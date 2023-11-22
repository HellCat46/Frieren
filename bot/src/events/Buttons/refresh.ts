import { embedError, embedTopic } from "../../components/EmbedTemplate";
import { getPageLink } from "../../components/Requests";
import { Params } from "./button.types";

module.exports = {
  async execute(params: Params) {
    await params.interaction.deferReply({ ephemeral: true });
    if (params.embed.footer && params.topic.page_count > 0) {
      const current_page = +params.embed.footer.text.split(" ")[0];
      const link = await getPageLink(
        params.interaction.client.api_url,
        params.interaction.client.file_router,
        params.topic.id,
        current_page
      );
      if (link instanceof Error) {
        await params.interaction.editReply({
          embeds: [embedError(link.message)],
        });
        return;
      }

      const msg = embedTopic({
        id: params.topic.id,
        topicName: params.topic.name,
        footer: `${current_page} of ${params.topic.page_count}`,
        pageurl: link,
      });
      await params.interaction.message.edit({
        embeds: [msg.embed],
        components: msg.rows,
      });
    } else if (params.topic.page_count > 0) {
      const link = await getPageLink(
        params.interaction.client.api_url,
        params.interaction.client.file_router,
        params.topic.id,
        1
      );
      if (link instanceof Error) {
        await params.interaction.editReply({
          embeds: [embedError(link.message)],
        });
        return;
      }

      const msg = embedTopic({
        id: params.topic.id,
        topicName: params.topic.name,
        footer: `${1} of ${params.topic.page_count}`,
        pageurl: link,
      });
      await params.interaction.message.edit({
        embeds: [msg.embed],
        components: msg.rows,
      });
    } else {
      const message = embedTopic({
        id: params.topic.id,
        topicName: params.topic.name,
      });
      await params.interaction.message.edit({
        embeds: [message.embed],
        components: message.rows.slice(1),
      });
    }
    await params.interaction.editReply({
      content: "Embed Refreshed Successfully",
    });
  },
};
