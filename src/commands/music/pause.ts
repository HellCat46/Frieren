import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the Music Player"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    if (interaction.client.voicePlayer.pause(true)){
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Paused the Music Player")
            .setDescription(
              `The Song [${interaction.client.musicQueue[0].title}](${interaction.client.musicQueue[0].url}) has been successfully paused. Use \`/resume\` to start from where you left again.`
            )
            .setTimestamp()
            .setColor("Yellow")
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });

      interaction.client.user.setActivity();
    }
    else
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Failed to Pause the Music")
            .setTimestamp()
            .setColor("Red")
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });
  },
};
