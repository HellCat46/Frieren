import { AudioPlayer, createAudioResource } from "@discordjs/voice";
import ytdl from "ytdl-core";
import { Music } from "../@types/discord";

export function secondsToString(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds - minutes * 60;

  return `${minutes < 10 ? "0" : ""}${minutes}:${sec < 10 ? "0" : ""}${sec}`;
}


export function playMusic(voicePlayer : AudioPlayer, music : Music){
  // Fetches the Audio
  const stream = ytdl(music.url, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream);
  voicePlayer.play(resource);
}