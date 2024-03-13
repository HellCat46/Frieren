import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getPlaylist, secondsToString } from "../../../components/musicPlayer";
import { embedError } from "../../../components/EmbedTemplate";
import ytdl from "ytdl-core";
import yts from "yt-search";
import { Frieren } from "../../../Frieren";

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

    // Fetches Song Ids from Database
    const songs = await getPlaylist(client.dbPool, userinfo.id);
    if (songs instanceof Error) {
      await interaction.editReply({ embeds: [embedError(songs.message)] });
      return;
    }

    // Fetches Songs Data with IDs
    const songsData: { title: string; url: string; length: number }[] = [];
    for (let idx = 0; idx < songs.length; idx++) {
      try {
        const data = (
          await ytdl.getInfo(`https://www.youtube.com/watch?v=${songs[idx]}`)
        ).videoDetails;

        songsData.push({
          title: data.title,
          url: data.video_url,
          length: parseInt(data.lengthSeconds),
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

    // Creating Embed and Adding Song Data to it
    const embed = new EmbedBuilder().setTitle(
      `${userinfo.username}'s Playlist`
    );
    for (let idx = 0; idx < songsData.length; idx++) {
      embed.addFields({
        name: `Song Duration: **${secondsToString(songsData[idx].length)}**`,
        value: `[${songsData[idx].title.toUpperCase()}](${songsData[idx].url})`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
