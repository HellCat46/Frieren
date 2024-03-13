import {
  Events,
  VoiceState,
  Client,
  EmbedBuilder,
} from "discord.js";
import { Frieren } from "../Frieren";

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(client: Frieren, oldState: VoiceState, newState: VoiceState) {
    try {
      if (client.user?.id === newState.id && client.music.queue.length !== 0) {
        const music = client.music.queue[0];
        const channel = await client.channels.fetch(music.channel);

        if (!oldState.mute && newState.mute) {
          if (client.music.player.pause(true)) {
            if (channel == null || !channel.isTextBased()) return;

            await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Successfully Paused the Music Player")
                  .setDescription(
                    `The Song [${music.title}](${music.url}) has been successfully paused. Use \`/resume\` to start from where you left again.`
                  )
                  .setColor("Yellow"),
              ],
            });
          }
        } else if (oldState.mute && !newState.mute) {
          if (client.music.player.unpause()) {
            if (channel == null || !channel.isTextBased()) return;
            await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Successfully Resumed the Music Player")
                  .setDescription(
                    `The Song [${music.title}](${music.url}) has been successfully resumed.`
                  )
                  .setColor("Green"),
              ],
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  },
};

// if(client.user?.id === userId){
//     if(client.music.queue.length > 0){

//     if(client.music.player.pause(true))
//     }
// }
