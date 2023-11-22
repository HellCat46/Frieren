import {
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ModalBuilder,
} from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
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
  },
};
