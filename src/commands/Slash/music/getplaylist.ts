import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  getPlaylist,
  playMusic,
  secondsToString,
} from "../../../components/musicPlayer";
import { embedError } from "../../../components/EmbedTemplate";
import ytdl from "ytdl-core";
import yts from "yt-search";
import { Frieren, Music } from "../../../Frieren";
import { joinVoiceChannel } from "@discordjs/voice";

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

    // Creating Embed and Adding Song Data to it
    const embed = new EmbedBuilder().setTitle(
      `${userinfo.username}'s Playlist`
    );

    // Creating the Selection Menu
    const songMenu = new StringSelectMenuBuilder()
      .setCustomId("musicMenu")
      .setPlaceholder("Select which song to play")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("All the songs")
          .setDescription("Every Song in the playlist")
          .setValue("all")
      );

    // Add Songs to the embed and Selection Menu
    for (let idx = 0; idx < songsData.length; idx++) {
      embed.addFields({
        name: `Song Duration: **${secondsToString(songsData[idx].length)}**`,
        value: `[${songsData[idx].title.toUpperCase()}](${songsData[idx].url})`,
      });

      songMenu.options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${idx}. ${songsData[idx].title}`)
          .setValue(`${idx}`)
      );
    }

    // Sends the Messages and wait for either user interaction or timeout.
    const resSelect = await (
      await interaction.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            songMenu
          ),
        ],
      })
    )
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.StringSelect,
        time: 30000,
      })
      .then((i) => i)
      .catch(() => null);

    await interaction.editReply({ components: [] });

    // If User didn't interacted with menu
    if (resSelect == null) return;
    await resSelect.deferReply({ ephemeral: true });

    if (!(resSelect.member instanceof GuildMember)) {
      await resSelect.editReply({
        embeds: [embedError("Only Guild Members can perform this action")],
      });
      return;
    }

    if (resSelect.member.voice.channel == null) {
      await resSelect.editReply({
        embeds: [
          embedError("You need to be in Voice Channel to perform this action."),
        ],
      });
      return;
    }

    const value = resSelect.values[0];

    // If Music Player is already running
    if (client.music.queue.length !== 0) {
      if (value === "all") {
        client.music.queue.push(...songsData);
      } else {
        client.music.queue.push(songsData[+value]);
      }

      await resSelect.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Added Song('s) to the Queue")
            .setColor("Green"),
        ],
      });
      return;
    }

    // Starts the Music Player
    try {
      const voiceConnection = joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: resSelect.member.voice.channel.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      if (value === "all") {
        playMusic(client.music.player, songsData[0]);
        voiceConnection.subscribe(client.music.player);
        client.music.queue.push(...songsData);
      } else {
        playMusic(client.music.player, songsData[+value]);
        voiceConnection.subscribe(client.music.player);
        client.music.queue.push(songsData[+value]);
      }

      await resSelect.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "Successfully Added Song('s) to Queue and Started the Music Player."
            )
            .setColor("Green"),
        ],
      });
    } catch (ex) {
      console.error(ex);
      resSelect.editReply({
        embeds: [
          embedError("Unexpected Error occured while processing the request"),
        ],
      });
    }
  },
};
