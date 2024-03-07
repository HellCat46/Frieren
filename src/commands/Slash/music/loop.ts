import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Make Music Player Loop over same song"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    if (interaction.client.music.loop == true) {
      interaction.client.music.loop = false;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Loop Mode Off")
            .setColor("Green")
            .setTimestamp()
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });
    } else {
      interaction.client.music.loop = true;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Loop Mode On")
            .setColor("Yellow")
            .setTimestamp()
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });
    }
  },
};
