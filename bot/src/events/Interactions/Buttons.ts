import {
  ActionRowBuilder,
  ButtonInteraction,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getPageLink } from "../../components/Requests";
import { embedError } from "../../components/EmbedTemplate";

export async function ButtonEvents(interaction: ButtonInteraction) {
  const id = interaction.customId;
  const key = id.split(".")[0];
  const topic = interaction.client.Topics.get(+key);
  if (!topic) return;

  const inbed = interaction.message.embeds[0];
  if (!inbed.footer) {
    await interaction.reply({
      embeds: [embedError("No pages")],
      ephemeral: true,
    });
    return;
  }
  const currentpage = +inbed.footer.text.split(" ")[0];

  if (id.endsWith("back")) {
    const pageno = currentpage - 1;
    if (0 >= pageno) {
      await interaction.reply({
        embeds: [embedError("You are already looking at first page")],
        ephemeral: true,
      });
      return;
    }

    const link = await getPageLink(+key, pageno);
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
  } else if (id.endsWith("select")) {
    const actionrow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("pageno")
        .setLabel("Enter Page number")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`1-${topic.page_count}`)
        .setValue(currentpage.toString())
    );
    const modal = new ModalBuilder()
      .setCustomId(`${key}.pagemodal`)
      .setTitle("Page No.")
      .addComponents(actionrow);
    await interaction.showModal(modal);
  } else if (id.endsWith("forward")) {
    const pageno = currentpage + 1;
    if (topic.page_count < pageno) {
      await interaction.reply({
        embeds: [embedError("You are already looking at last page")],
        ephemeral: true,
      });
      return;
    }

    const link = await getPageLink(+key, pageno);
    if (!link.startsWith("http")) {
      await interaction.reply({ embeds: [embedError(link)], ephemeral: true });
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
  } else if (id.endsWith("add")) {
    interaction.reply("Add");
  } else if (id.endsWith("remove")) {
    interaction.reply("Remove");
  } else if (id.endsWith("advance")) {
    interaction.reply("Advance");
  }
}
