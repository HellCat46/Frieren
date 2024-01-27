import {
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ModalBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { Params } from "./button.types";
import { getPageLink } from "../../components/Requests";

module.exports = {
  async execute(params: Params) {
    if (!params.interaction.channel) return;

    if (!params.embed.footer) {
      await params.interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }
    const actionrow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("pageno")
        .setLabel("Enter Page number")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`1-${params.topic.page_count}`)
        .setValue(params.embed.footer.text.split(" ")[0])
    );
    const modal = new ModalBuilder()
      .setCustomId(`${params.topic.id}.pagemodal`)
      .setTitle("Page No.")
      .addComponents(actionrow);
    await params.interaction.showModal(modal);

    const submitted = await params.interaction
      .awaitModalSubmit({
        time: 60000,
        filter: (author) => author.user.id === params.interaction.user.id,
      })
      .catch((err) => new Error("Failed to get input from Form."));

    if (submitted instanceof Error) return;


    await submitted.deferReply({ ephemeral: true });
    const pageno = +submitted.fields.getTextInputValue("pageno");
    if (!pageno) {
      await submitted.editReply({
        embeds: [embedError("Only Numeric Values are allowed.")],
      });
      return;
    } else if (0 >= pageno || pageno > params.topic.page_count) {
      await submitted.editReply({
        embeds: [
          embedError(`Out of Page Range (1-${params.topic.page_count})`),
        ]
      });
      return;
    }

    const path = await getPageLink(
      params.interaction.client.dbPool,
      params.topic.id,
      pageno
    );
    if (path instanceof Error) {
      await params.interaction.followUp({
        embeds: [embedError(path.message)],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(params.embed.title)
      .setImage(`attachment://${path.split("/").at(-1)}`)
      .setFooter({ text: `${pageno} of ${params.topic.page_count}` });

    await submitted.deleteReply();
    await params.interaction.message.edit({
      embeds: [embed],
      components: params.interaction.message.components,
      files: [new AttachmentBuilder(path)]
    });
  },
};
