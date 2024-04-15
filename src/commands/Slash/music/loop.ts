import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../../components/musicPlayer";
import { Frieren } from "../../../Frieren";
import { AudioPlayerStatus } from "@discordjs/voice";
import { embedError } from "../../../components/EmbedTemplate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Make Music Player Loop over same song"),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (client.music.player.state.status !== AudioPlayerStatus.Playing) {
      await interaction.editReply({
        embeds: [
          embedError(
            "This action can only be performed when Music is playing."
          ),
        ],
      });
      return;
    }

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    if (client.music.loop == true) {
      client.music.loop = false;
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
      client.music.loop = true;
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
