import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice, playMusic, stopMusic } from "../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the currently playing song"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const musicQueue = interaction.client.musicQueue;

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    if (musicQueue.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Queue is completely empty")
            .setDescription(
              "use `/playmusic` command to add music to the queue"
            )
            .setColor("Red"),
        ],
      });
      return;
    }

    // Removes Currenlty playing song from Queue
    musicQueue.shift();

    // Stops the player completely if there no more songs in queue
    if (musicQueue.length === 0) {
      stopMusic(interaction.client, interaction.guildId);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Succesfully Skipped the Song")
            .setDescription(
              "There is no more songs to play in the queue; therefore, the player has been stopped . Use `/playmusic` command to add."
            )
            .setColor("Red")
            .setTimestamp()
            .setFooter({ text: `Request by: ${interaction.user.username}` }),
        ],
      });

      return;
    }

    // Fetches Audio from Youtube
    const music = musicQueue[0];
    playMusic(interaction.client.voicePlayer, music);

    const embed = new EmbedBuilder()
      .setTitle("Successfully Skipped the Song")
      .setDescription(
        `Skipped the currently playing song. Next will be playing [${music.title}](${music.url})`
      )
      .setColor("Green")
      .setFooter({ text: `Request by: ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    interaction.client.user?.setActivity({
      name: music.title,
      type: ActivityType.Playing,
    });
  },
};
