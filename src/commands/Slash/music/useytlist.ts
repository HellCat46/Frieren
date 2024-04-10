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
import ytpl from "ytpl";
import { Frieren, Music } from "../../../Frieren";
import { embedError } from "../../../components/EmbedTemplate";
import { playMusic, secondsToString } from "../../../components/musicPlayer";
import { joinVoiceChannel } from "@discordjs/voice";

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
    if(interaction.member.voice.channel == null){
      await interaction.editReply({embeds: [embedError("You need to be in a Voice Channel to perform this action.")]})
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

    // Embed to show All the songs in playlist
    const songList = new EmbedBuilder()
      .setTitle(playlistRes.title)
      // .setDescription(playlistRes.description)
      .setFooter({ text: `This Prompt will expire after 15 seconds.` });

    // Selection Menu for user to select song('s) from list
    const songMenu = new StringSelectMenuBuilder()
      .setPlaceholder("Choose Which song to play?")
      .setCustomId("songmenu")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("All")
          .setValue("all")
          .setDescription("Use All the songs")
      );

    for (let idx = 0; playlistRes.items.length > idx ; idx++) {
      const song = playlistRes.items[idx];

      if (song.durationSec == null) continue;

      if(24 > idx){
        const duration = song.durationSec;
        songList.addFields({
          name: song.title,
          value: `Song Duration: ${
            duration ? secondsToString(duration) : "Unknown"
          }`,
        });
        songMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(song.title)
            .setDescription(`By: ${song.author.name}`)
            .setValue(`${idx}`)
        );
      }

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

    const res = await (
      await interaction.editReply({
        embeds: [songList],
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
        time: 15000,
      })
      .then((i) => i)
      .catch(() => null);

    if (res == null) {
      await interaction.editReply({
        embeds: [embedError("Timer Ended")],
        components: [],
      });
      return;
    }

    // If User didn't interacted with menu
    if (res == null) return;
    await res.deferReply({ ephemeral: true });

    if (!(res.member instanceof GuildMember)) {
      await res.editReply({
        embeds: [embedError("Only Guild Members can perform this action")],
      });
      return;
    }

    if (res.member.voice.channel == null) {
      await res.editReply({
        embeds: [
          embedError("You need to be in Voice Channel to perform this action."),
        ],
      });
      return;
    }

    const value = res.values[0];

    // If Music Player is already running
    if (client.music.queue.length !== 0) {
      if (value === "all") {
        client.music.queue.push(...songsData);
      } else {
        client.music.queue.push(songsData[+value]);
      }

      await res.editReply({
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
        guildId: interaction.member.guild.id,
        channelId: res.member.voice.channel.id,
        adapterCreator: interaction.member.guild.voiceAdapterCreator,
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

      await res.editReply({
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
      await res.editReply({
        embeds: [
          embedError("Unexpected Error occured while processing the request"),
        ],
      });
    }
    await interaction.deleteReply();
  },
};
