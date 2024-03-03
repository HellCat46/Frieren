import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resumes the paused music"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // if (interaction.client.musicQueue.length === 0) {
    //   await interaction.editReply({
    //     embeds: [
    //       new EmbedBuilder()
    //         .setTitle("Nothing to Resume")
    //         .setDescription(
    //           "Music Player is completely empty. There is nothing to resume"
    //         )
    //         .setTimestamp()
    //         .setFooter({ text: `Request By: ${interaction.user.username}` }),
    //     ],
    //   });
    //   return;
    // }

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    // The Queue wouldn't be empty if the interpreter reached here
    // Why? Because Bot will disconnect from the VC as soon as last song has ended/skipped/stopped.
    if (interaction.client.voicePlayer.unpause()){
      const music = interaction.client.musicQueue[0];
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Resumed the Music Player")
            .setDescription(
              `The Song [${music.title}](${music.url}) has been successfully resumed.`
            )
            .setColor("Green")
            .setTimestamp()
            .setFooter({ text: `Request by: ${interaction.user.username}` }),
        ],
      });

      interaction.client.user?.setActivity({
            name: music.title,
            type: ActivityType.Playing,
        
      });
    }
    else
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Failed to Resume the Music Player")
            .setColor("Red")
            .setTimestamp()
            .setFooter({ text: `Request by ${interaction.user.username}` }),
        ],
      });
  },
};
