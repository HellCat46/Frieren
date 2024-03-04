import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import {
  getPlaylistSongs,
  isInVoice,
  playMusic,
  secondsToString,
} from "../../../components/musicPlayer";
import { embedError } from "../../../components/EmbedTemplate";
import ytdl from "ytdl-core";
import { Music } from "../../../@types/discord";
import { joinVoiceChannel } from "@discordjs/voice";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("useplaylist")
    .setDescription("Adds your whole playlist to the Music Queue"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    {
      if (!(interaction.member instanceof GuildMember)) {
        await interaction.editReply({
          embeds: [embedError("User is not a Guild Member???")],
        });
        return;
      }

      if (interaction.member.voice.channel == null) {
        await interaction.editReply({
          embeds: [
            embedError("You need to be in Voice Channel to use this command."),
          ],
        });
        return;
      }
      if (interaction.guild === null) {
        await interaction.editReply({
          embeds: [embedError("Unable to get Guild Somehow")],
        });
        return;
      }

      if (!interaction.member.voice.channel.joinable) {
        await interaction.editReply({
          embeds: [
            embedError(
              "I don't have permission to join the channel you are currently in D:."
            ),
          ],
        });
        return;
      }
    }

    // Songs in User Playlist
    const songs = await getPlaylistSongs(
      interaction.client.dbPool,
      interaction.user.id
    );
    if (songs instanceof Error) {
      await interaction.editReply({ embeds: [embedError(songs.message)] });
      return;
    }

    // Fetches Required Info about the Songs
    const addedSongs: Music[] = [];
    for (let idx = 0; idx < songs.length; idx++) {
      try {
        const videoInfo = (
          await ytdl.getInfo(`https://www.youtube.com/watch?v=${songs[idx]}`)
        ).videoDetails;

        addedSongs.push({
          title: videoInfo.title,
          url: videoInfo.video_url,
          thumbnail: videoInfo.video_url,
          length: parseInt(videoInfo.lengthSeconds),
          author: {
            name: videoInfo.author.name,
            url: videoInfo.author.channel_url,
          },
          channel: interaction.channelId,
          guild: interaction.guild.id,
        });
      } catch (ex) {
        console.error(ex);
      }
    }

    if (addedSongs.length === 0) {
      await interaction.editReply({
        embeds: [
          embedError("Unable to Fetch Info about any song in your playlist."),
        ],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Songs Added to Queue from your Playlist")
      .setColor("Random");

    for (let idx = 0; idx < addedSongs.length; idx++) {
      embed.addFields({
        value: `[${addedSongs[idx].title}](${addedSongs[idx].url})`,
        name: `Song Duration: ${secondsToString(addedSongs[idx].length)}`,
      });
    }

    // Connects the Bot and Start the Player if Queue is Empty
    if (interaction.client.musicQueue.length === 0) {
      playMusic(interaction.client.voicePlayer, addedSongs[0]);

      const connection = joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: interaction.member.voice.channel.id,
        adapterCreator:
          interaction.member.voice.channel.guild.voiceAdapterCreator,
      });

      connection.subscribe(interaction.client.voicePlayer);

      if (embed.data.fields != null)
        embed.data.fields[0].name += " (Currently Playing)";
    }

    interaction.client.musicQueue.push(...addedSongs);

    await interaction.editReply({ embeds: [embed] });
  },
};
