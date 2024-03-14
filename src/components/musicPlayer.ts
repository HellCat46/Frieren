import {
  AudioPlayer,
  createAudioResource,
  getVoiceConnection,
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
} from "discord.js";
import { Pool } from "pg";
import { Frieren, Music } from "../Frieren";

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
    const songs : string[] = res.rows[0]._songIds;
    if (songs.length >0) return songs;

    return new Error("User doesn't have any songs in your Playlist.")
  }
  return new Error("User doesn't have a playlist.");
}
