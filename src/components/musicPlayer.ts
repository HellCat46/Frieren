import {
  AudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import {
  APIEmbedField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Pool } from "pg";
import { Frieren, Music } from "../Frieren";
import { embedError } from "./EmbedTemplate";

export function secondsToString(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds - minutes * 60;

  return `${minutes < 10 ? "0" : ""}${minutes}:${sec < 10 ? "0" : ""}${sec}`;
}

export function playMusic(voicePlayer: AudioPlayer, music: Music) {
  // Fetches the Audio
  const stream = ytdl(music.url, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream);
  voicePlayer.play(resource);
}

export function stopMusic(client: Frieren, guildId: string | undefined | null) {
  client.music.queue = [];
  client.music.player.stop(true);

  // Destroys resources allocated the connection and disconnects the bot from Voice Channel
  if (guildId == undefined) return;
  const conn = getVoiceConnection(guildId);
  if (conn) conn.destroy();

  client.music.loop = false;
  client.user?.setActivity();
}

export function isInVoice(interaction: ChatInputCommandInteraction) {
  if (!(interaction.member instanceof GuildMember)) {
    return new EmbedBuilder()
      .setTitle("User is not a Guild Member")
      .setColor("Red");
  }

  if (
    interaction.guild?.members?.me?.voice?.channelId !==
    interaction.member.voice.channelId
  ) {
    return new EmbedBuilder()
      .setTitle("Invalid Interaction")
      .setDescription(
        "You need to be in same channel as Bot to use this command"
      )
      .setColor("Red");
  }
}

export async function addToPlaylist(
  dbPool: Pool,
  userId: string,
  videoId: string
) {
  // Retrieve all video IDs
  const res = await dbPool.query(
    `SELECT "_songIds" FROM playlist WHERE playlist."_userId" = '${userId}';`
  );
  if (res.rowCount != 0) {
    if (res.rows[0]._songIds.includes(videoId))
      return new Error("Song is already in your playlist");

    // Add Video to Playlist
    await dbPool.query(
      `UPDATE playlist SET "_songIds" = array_append(playlist."_songIds", '${videoId}') WHERE playlist."_userId" = '${userId}' ;`
    );
    return;
  }

  await dbPool.query(
    `INSERT INTO playlist VALUES('${userId}', '{${videoId}}');`
  );
}

export async function removeToPlaylist(
  dbPool: Pool,
  userId: string,
  videoId: string
) {
  if (
    (
      await dbPool.query(
        `SELECT COUNT(*) FROM playlist WHERE playlist."_userId" = '${userId}' AND '${videoId}' = ANY(playlist."_songIds");`
      )
    ).rows[0].count == 0
  )
    return new Error(
      "You don't have either this song in your playlist or a playlist at all."
    );

  // Remove Song from playlist
  await dbPool.query(
    `UPDATE public.playlist SET "_songIds" = array_remove(playlist."_songIds", '${videoId}') WHERE playlist."_userId" = '${userId}';`
  );
}

export async function getPlaylist(dbPool: Pool, userId: string) {
  // Retrieve all video IDs
  const res = await dbPool.query(
    `SELECT "_songIds" FROM playlist WHERE playlist."_userId" = '${userId}';`
  );

  if (res.rowCount != 0) {
    const songs: string[] = res.rows[0]._songIds;
    if (songs.length > 0) return songs;

    return new Error("User doesn't have any songs in your Playlist.");
  }
  return new Error("User doesn't have a playlist.");
}

export function inputToSelectedsongs(songs: Music[], input: string) {
  try {
    if (input.toLowerCase() === "all") return songs;

    if (input.includes("-")) {
      const items = input.split("-");
      if (!isNaN(parseInt(items[0])) && !isNaN(parseInt(items[1])))
        return songs.slice(+items[0] - 1, +items[1]);
    }

    if (!isNaN(parseInt(input))) return [songs[parseInt(input) - 1]];
    else return [];
  } catch (ex) {
    return [];
  }
}

export async function MusicSelectorWithPagination(
  client: Frieren,
  interaction: ChatInputCommandInteraction,
  songListEmbed: EmbedBuilder,
  pages: APIEmbedField[][],
  playlistSongs: Music[]
) {
  const collector = (
    await interaction.editReply({
      embeds: [songListEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("pageback")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("pageforw")
            .setLabel("Forward")
            .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("choose")
            .setLabel("Choose")
            .setStyle(ButtonStyle.Primary)
        ),
      ],
    })
  ).createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 60000,
  });

  let input: string | null = null;
  collector.on("collect", async (inter) => {
    if (!inter.isButton()) return;

    const pageStr = songListEmbed.data.footer?.text.split(" ")[0];
    if (pageStr == undefined) return;

    let pageNo = +pageStr;

    switch (inter.customId) {
      case "pageback": {
        if (1 === pageNo) {
          await inter.reply({
            embeds: [embedError("You are already looking at first page.")],
            ephemeral: true,
          });
          return;
        }

        songListEmbed
          .setFields(pages[--pageNo])
          .setFooter({ text: `${pageNo} of ${pages.length}` });
        await inter.update({ embeds: [songListEmbed] });

        break;
      }
      case "pageforw": {
        if (pages.length === pageNo) {
          await inter.reply({
            embeds: [embedError("You are already looking at last page.")],
            ephemeral: true,
          });
          return;
        }

        songListEmbed
          .setFields(pages[++pageNo])
          .setFooter({ text: `${pageNo} of ${pages.length}` });
        await inter.update({ embeds: [songListEmbed] });

        break;
      }
      case "choose": {
        const modal = new ModalBuilder()
          .setTitle("Choose Song you want to add in Queue.")
          .setCustomId("songSelector")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("songInput")
                .setLabel("Input")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("Valid Options: all, Number(1) and Range(1-3)")
            )
          );
        await inter.showModal(modal);

        const i = await inter.awaitModalSubmit({ time: 60_000 });
        await i.deferReply();
        input = i.fields.getTextInputValue("songInput");
        await i.deleteReply();
        collector.stop();
        break;
      }
    }
  });
  collector.on("end", async () => {
    await interaction.editReply({ components: [] });

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

    // If User didn't interacted with Modal or ActionRow
    if (input === null) return;

    const selectedSongs = inputToSelectedsongs(playlistSongs, input);
    console.log(selectedSongs);

    if (selectedSongs.length === 0) {
      await interaction.editReply({
        embeds: [
          embedError(
            "Invalid Input in Modal. Unable to add any song in Queue."
          ),
        ],
      });
      return;
    }

    // If Music Player is already running
    if (client.music.queue.length !== 0) {
      client.music.queue.push(...selectedSongs);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Added Song('s) to the Queue")
            .setColor("Green"),
        ],
      });
      return;
    }

    try {
      const voiceConnection = joinVoiceChannel({
        guildId: interaction.member.guild.id,
        channelId: interaction.member.voice.channel.id,
        adapterCreator: interaction.member.guild.voiceAdapterCreator,
      });

      playMusic(client.music.player, selectedSongs[0]);
      voiceConnection.subscribe(client.music.player);
      client.music.queue.push(...selectedSongs);

      await interaction.editReply({
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
      await interaction.editReply({
        embeds: [
          embedError("Unexpected Error occured while processing the request"),
        ],
      });
    }
  });
}
