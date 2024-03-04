import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { secondsToString } from "../../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Get Queue of Music"),
    
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const musicQueue = interaction.client.musicQueue;

    // If Nothing is playing
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

    // Creates Embed and adds currenlty playing song in the embed list
    const embed = new EmbedBuilder()
      .setTitle("List of Music in the Queue.")
      .setColor("Random")
      .setTimestamp()
      .addFields({
        name: `${secondsToString(musicQueue[0].length)} (Currently Playing)`,
        value: `[${musicQueue[0].title}](${musicQueue[0].url})`,
      });

    // Adds rest of Songs in the embed list
    for (let idx = 1; idx < musicQueue.length; idx++) {
      embed.addFields({
        name: `${secondsToString(musicQueue[idx].length)}`,
        value: `[${musicQueue[idx].title}](${musicQueue[idx].url})`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
