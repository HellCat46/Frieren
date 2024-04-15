import {
  Events,
  VoiceState,
  EmbedBuilder,
  Channel,
} from "discord.js";
import { Frieren } from "../Frieren";
import { stopMusic } from "../components/musicPlayer";

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(client: Frieren, oldState: VoiceState, newState: VoiceState) {
    try {
      if (client.user?.id !== newState.id || client.music.queue.length === 0)
        return;

      const music = client.music.queue[0];
      const channel = await client.channels.fetch(music.channel);

      // Stop and Clear Music Queue after Bot is disconnected from VC
      if (oldState.channel != null && newState.channel == null) {
        stopMusic(client, oldState.channel.guildId);
        sendMessage(
          channel,
          new EmbedBuilder()
            .setTitle("Bot was disconnected from the VC Channel")
            .setDescription(
              "Player has been stopped and Queue is also cleared."
            )
            .setColor("Red")
            .setTimestamp()
        );
        return;
      }

      // Pauses and Resume player whenever bot is serverMute has changed.
      if (!oldState.mute && newState.mute && client.music.player.pause(true)) {
        sendMessage(
          channel,
          new EmbedBuilder()
            .setTitle("Successfully Paused the Music Player")
            .setDescription(
              `The Song [${music.title}](${music.url}) has been successfully paused.`
            )
            .setColor("Yellow")
        );
        return;
      } else if (
        oldState.mute &&
        !newState.mute &&
        client.music.player.unpause()
      ) {
        sendMessage(
          channel,
          new EmbedBuilder()
            .setTitle("Successfully Resumed the Music Player")
            .setDescription(
              `The Song [${music.title}](${music.url}) has been successfully resumed.`
            )
            .setColor("Green")
        );
        return;
      }
    } catch (err) {
      console.error(err);
    }
  },
};

async function sendMessage(channel: Channel | null, embed: EmbedBuilder) {
  if (channel == null || !channel.isTextBased()) return;

  await channel.send({ embeds: [embed] });
}
