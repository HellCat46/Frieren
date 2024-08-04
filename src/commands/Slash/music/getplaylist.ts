import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import {
  MusicSelectorWithPagination,
  getPlaylist,
} from "../../../components/musicPlayer";
import {
  embedError,
  songsToEmbedPages,
} from "../../../components/EmbedTemplate";
import ytdl from "@distube/ytdl-core";
import { Frieren, Music } from "../../../Frieren";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getplaylist")
    .setDescription("Get Playlist of An User")
    .addUserOption((options) =>
      options
        .setName("user")
        .setDescription("User you want playlist to see")
        .setRequired(false)
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("user", false);
    const userinfo = user == null ? interaction.user : user;

    if (interaction.guild === null) {
      await interaction.editReply({
        embeds: [embedError("Unable to get Guild Somehow")],
      });
      return;
    }

    // Fetches Song Ids from Database
    const songs = await getPlaylist(client.dbPool, userinfo.id);
    if (songs instanceof Error) {
      await interaction.editReply({ embeds: [embedError(songs.message)] });
      return;
    }

    // Fetches Songs Data with IDs
    const songsData: Music[] = [];
    for (let idx = 0; idx < songs.length; idx++) {
      try {
        const video = (
          await ytdl.getInfo(`https://www.youtube.com/watch?v=${songs[idx]}`)
        ).videoDetails;

        songsData.push({
          title: video.title,
          url: video.video_url,
          length: parseInt(video.lengthSeconds),
          author: {
            name: video.author.name,
            url: video.author.channel_url,
          },
          thumbnail: video.thumbnails[0].url,
          channel: interaction.channelId,
          guild: interaction.guild.id,
        });
      } catch (ex) {
        console.error(ex);
      }
    }

    if (songsData.length == 0) {
      await interaction.editReply({
        embeds: [embedError("Unable to Fetch Data of Any Song")],
      });
      return;
    }

    const pages = songsToEmbedPages(songsData);

    // Creating Embed and Adding Song Data to it
    const embed = new EmbedBuilder()
      .setTitle(`${userinfo.username}'s Playlist`)
      .setColor(interaction.user.accentColor ?? null)
      .setFields(pages[0])
      .setFooter({ text: `1 of ${pages.length}` });

    await MusicSelectorWithPagination(
      client,
      interaction,
      embed,
      pages,
      songsData
    );
  },
};
