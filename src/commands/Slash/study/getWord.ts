import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Frieren } from "../../../Frieren";
import { embedError } from "../../../components/EmbedTemplate";
import { getWordDetails } from "../../../components/Words";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getword")
    .setDescription("Get a random word with its meaning")
    .addStringOption((options) =>
      options.setName("word").setDescription("Word that you want meaning of")
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const argWord = interaction.options.getString("word");

    const res = await getWordDetails(argWord);
    if (res instanceof Error) {
      await interaction.editReply({ embeds: [embedError(res.message)] });
      return;
    }

    await interaction.editReply({ embeds: res });
  },
};
