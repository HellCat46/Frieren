import { joinVoiceChannel } from "@discordjs/voice";
import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { embedError } from "../../../components/EmbedTemplate";
import ytdl from "ytdl-core";
import yts from "yt-search";
import { Music } from "../../../@types/discord";
import { addToPlaylist, playMusic, removeToPlaylist, secondsToString } from "../../../components/musicPlayer";

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

    let videoId;
    // Get All the Info Required to play that music
    let music: Music;
    if (pattern.test(input)) {
      const fileInfo = (await ytdl.getInfo(input)).videoDetails;
      videoId = fileInfo.videoId;
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
      videoId = fileInfo.videoId;
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
      .setDescription(`Song Duration: **${secondsToString(music.length)}**`)
      .setAuthor({ name: music.author.name, url: music.author.url })
      .setURL(music.url)
      .setImage(music.thumbnail ? music.thumbnail : null)
      .setTimestamp()
      .setFooter({
        text: `Request by ${interaction.user.username} | Input: ${input}`,
      });

    // Buttons for user to add or remove a song from their own playlist.
    const playlistBtns = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Add To Playlist")
          .setCustomId("addToPlay")
          .setStyle(ButtonStyle.Primary)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel("Remove From Playlist")
          .setCustomId("removeFromPlay")
          .setStyle(ButtonStyle.Danger)
      );

    // Add Song to Queue
    if (interaction.client.music.queue.length > 0) {
      const notifEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("Succesfully added in the queue");

      if (interaction.client.music.queue.length == 1)
        notifEmbed.setDescription(
          "This song will be played next after the current one."
        );
      else
        notifEmbed.setDescription(
          `This song will be played after ${
            interaction.client.music.queue.length - 1
          } songs that are already in list`
        );

      interaction.client.music.queue.push(music);
      const res = await(
        await interaction.editReply({
          embeds: [infoEmbed, notifEmbed],
          components: [playlistBtns],
        })
      )
        .awaitMessageComponent({
          // Collector to Collect Playlist buttons
          filter: (i) => i.user.id == interaction.user.id,
          time: music.length * 1000,
          componentType: ComponentType.Button,
        })
        .then((i) => i.customId)
        .catch(() => null);

      await interaction.editReply({
        embeds: [infoEmbed, notifEmbed],
        components: [],
      });

      if (res == null) return;
      await collPlaylistBtn(videoId, interaction, res);
      return;
    }

    playMusic(interaction.client.music.player, music);

    // Joins Voice Channel to Create an Connection
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.member.guild.id,
      adapterCreator:
        interaction.member.voice.channel.guild.voiceAdapterCreator,
    });
    connection.subscribe(interaction.client.music.player);

    interaction.client.music.queue.push(music);

    interaction.client.user?.setActivity({
      name: music.title,
      type: ActivityType.Playing,
    });

    const res = await (
      await interaction.editReply({
        embeds: [infoEmbed],
        components: [playlistBtns],
      })
    )
      .awaitMessageComponent({
        // Collector to Collect Playlist buttons
        filter: (i) => i.user.id === interaction.user.id,
        time: music.length*1000,
        componentType: ComponentType.Button,
      })
      .then((i) => i.customId)
      .catch(() => null);

    await interaction.editReply({
      embeds: [infoEmbed],
      components: []
    })
    if (res == null) return;
    await collPlaylistBtn(videoId, interaction, res);
  },
};

async function collPlaylistBtn(videoId: string, interaction: ChatInputCommandInteraction, customId: string) {
  try {
  if(customId == "addToPlay"){
    const res = await addToPlaylist(interaction.client.dbPool, interaction.user.id, videoId);  

    if(res instanceof Error){
      await interaction.followUp({
        embeds: [embedError(res.message)],
        ephemeral: true,
      });
      return
    }
    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("Succesfully Added the Song to your playlist."),
      ],
      ephemeral: true,
    });
  }else {
    const res = await removeToPlaylist(interaction.client.dbPool, interaction.user.id, videoId);

    if (res instanceof Error) {
      await interaction.followUp({
        embeds: [embedError(res.message)],
        ephemeral: true,
      });
      return;
    }
    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("Succesfully Removed the Song from your playlist."),
      ],
      ephemeral: true,
    });
  }
  }catch(ex){
    await interaction.followUp({embeds: [embedError("Failed to Make Changes to Database.")], ephemeral: true});
    console.log(ex);
  }
}