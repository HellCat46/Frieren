import { EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { embedError } from "../../components/EmbedTemplate";
import { getPageLink } from "../../components/Requests";

export async function ModalEvents(interaction: ModalSubmitInteraction) {
  if (!interaction.message) return;
  if (!interaction.isFromMessage()) return;
  const id = interaction.customId;
  const key = id.split(".")[0];
  const topic = interaction.client.Topics.get(+key);
  if (!topic) return;

  if (id.endsWith("pagemodal")) {
    const inbed = interaction.message.embeds[0];
    if (!inbed.footer) {
      await interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }


    const pageno =  +interaction.fields.getTextInputValue("pageno");
    if(!pageno){
        await interaction.reply({
          embeds: [embedError("Only Numeric Values are allowed.")],
          ephemeral: true,
        });
        return;
    }else if (0 >= pageno || pageno > topic.page_count){
        await interaction.reply({
          embeds: [embedError(`Out of Page Range (1-${topic.page_count})`)],
          ephemeral: true,
        });
        return;
    }

    const link = await getPageLink(interaction.client.api_url, +key, pageno);
    if (!link.startsWith("http")) {
      await interaction.reply({
        embeds: [embedError(link)],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(inbed.title)
      .setImage(link)
      .setFooter({ text: `${pageno} of ${topic.page_count}` });

    await interaction.update({
      embeds: [embed],
      components: interaction.message.components,
    });
  }
}
