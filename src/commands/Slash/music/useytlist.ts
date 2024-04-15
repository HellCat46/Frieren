import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import ytpl from "ytpl";
import { Frieren, Music } from "../../../Frieren";
import {
  embedError,
  songsToEmbedPages,
} from "../../../components/EmbedTemplate";
import { MusicSelectorWithPagination } from "../../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("useytlist")
    .setDescription("Play the songs from Youtube Playlist")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Url of the Youtube Playlist")
        .setRequired(true)
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const playlistUrl = interaction.options.getString("url", true);

    // Checks before performing the requested action
    if (
      interaction.member == null ||
      !(interaction.member instanceof GuildMember)
    ) {
      await interaction.editReply({
        embeds: [
          embedError("User needs to be a Guild Member to perform this action"),
        ],
      });
      return;
    }
    if (interaction.member.voice.channel == null) {
      await interaction.editReply({
        embeds: [
          embedError(
            "You need to be in a Voice Channel to perform this action."
          ),
        ],
      });
      return;
    }

    let playlistRes: ytpl.Result | null = null;
    const songsData: Music[] = [];

    // Fetches Info about the Playlist
    try {
      playlistRes = await ytpl(playlistUrl);
    } catch (ex) {
      console.log(ex);
      await interaction.editReply({
        embeds: [
          embedError(
            "Unable to get info about the Playlist. The Playlist is either Invalid or Private."
          ),
        ],
      });
      return;
    }

    // Checks if Res is valid or it has any song
    if (playlistRes == null || playlistRes.items.length == 0) {
      await interaction.editReply({
        embeds: [embedError("No Song to play in the playlist.")],
      });
      return;
    }

    // Converts playlist response into Music Object List
    for (const song of playlistRes.items) {
      // If item is live stream
      if (song.durationSec == null) continue;

      songsData.push({
        title: song.title,
        url: song.url,
        author: {
          name: song.author.name,
          url: song.author.url,
        },
        channel: interaction.channelId,
        guild: interaction.member.guild.id,
        thumbnail: song.bestThumbnail.url ?? undefined,
        length: song.durationSec,
      });
    }

    const fieldsArray = songsToEmbedPages(songsData);

    // Embed to show All the songs in playlist
    const songList = new EmbedBuilder()
      .setTitle(playlistRes.title)
      //.setDescription(playlistRes.description)
      .setAuthor({
        name: playlistRes.author.name,
        url: playlistRes.author.url,
        iconURL: playlistRes.author.bestAvatar.url ?? undefined,
      })
      .setFields(fieldsArray[0])
      .setFooter({ text: `1 of ${fieldsArray.length}` });

    await MusicSelectorWithPagination(
      client,
      interaction,
      songList,
      fieldsArray,
      songsData
    );
  },
};
