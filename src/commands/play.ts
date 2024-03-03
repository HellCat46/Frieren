import {
  AudioPlayer,
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  getGroups,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
} from "@discordjs/voice";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { embedError } from "../components/EmbedTemplate";
import ytdl from "ytdl-core";
import yts from "yt-search";
import { Music } from "../@types/discord";
import { createWriteStream } from "fs";
import { playMusic, secondsToString } from "../components/musicPlayer";

const pattern =
  /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playmusic")
    .setDescription("Play Audio from Youtube")
    .addStringOption((options) =>
      options
        .setName("input")
        .setDescription("Name or Link of Song")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const input = interaction.options.getString("input", true);

    // Checks before starting working on the request
    {
      if (interaction.guild === null) {
        await interaction.editReply({
          embeds: [embedError("Unable to get Guild Somehow")],
        });
        return;
      }

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

    // Get All the Info Required to play that music
    let music: Music;
    if (pattern.test(input)) {
      const fileInfo = (await ytdl.getInfo(input)).videoDetails;
      music = {
        title: fileInfo.title,
        url: fileInfo.video_url,
        thumbnail: fileInfo.thumbnails[0].url,
        author: {
          name: fileInfo.author.name,
          url: fileInfo.author.channel_url,
        },
        length: parseInt(fileInfo.lengthSeconds),
        channel: interaction.channelId,
        guild: interaction.guild.id,
      };
    } else {
      const fileInfo = (await yts(input)).videos[0];
      music = {
        title: fileInfo.title,
        url: fileInfo.url,
        thumbnail: fileInfo.thumbnail,
        author: fileInfo.author,
        length: fileInfo.seconds,
        channel: interaction.channelId,
        guild: interaction.guild.id,
      };
    }

    // Music Info Embed
    const infoEmbed = new EmbedBuilder()
      .setTitle(music.title)
      .setDescription(`Media Duration: ${secondsToString(music.length)}`)
      .setAuthor({ name: music.author.name, url: music.author.url })
      .setURL(music.url)
      .setImage(music.thumbnail ? music.thumbnail : null)
      .setTimestamp()
      .setFooter({
        text: `Request by ${interaction.user.username} | Input: ${input}`,
      });

    // Add Song to Queue
    if (interaction.client.musicQueue.length > 0) {
      const notifEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("Succesfully added in the queue");

      if (interaction.client.musicQueue.length == 1)
        notifEmbed.setDescription(
          "This song will be played next after the current one."
        );
      else
        notifEmbed.setDescription(
          `This song will be played after ${
            interaction.client.musicQueue.length - 1
          } songs that are already in list`
        );

      await interaction.editReply({ embeds: [infoEmbed, notifEmbed] });
      interaction.client.musicQueue.push(music);
      return;
    }

    playMusic(interaction.client.voicePlayer, music);

    // Joins Voice Channel to Create an Connection
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.member.guild.id,
      adapterCreator:
        interaction.member.voice.channel.guild.voiceAdapterCreator,
    });
    connection.subscribe(interaction.client.voicePlayer);

    
    interaction.client.musicQueue.push(music);
    await interaction.editReply({ embeds: [infoEmbed] });
  },
};
