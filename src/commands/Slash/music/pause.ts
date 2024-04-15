import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../../components/musicPlayer";
import { Frieren } from "../../../Frieren";
import { AudioPlayerStatus } from "@discordjs/voice";
import { embedError } from "../../../components/EmbedTemplate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the Music Player"),

  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (client.music.player.state.status !== AudioPlayerStatus.Playing) {
      await interaction.editReply({
        embeds: [
          embedError(
            "This action can only be performed when Music is playing."
          ),
        ],
      });
      return;
    }

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    // if(interaction.memberPermissions?.has("Administrator")){
    //   if (!(interaction.member instanceof GuildMember)) {
    //     await interaction.editReply({ embeds: [ new EmbedBuilder()
    //       .setTitle("User is not a Guild Member")
    //       .setColor("Red")]});
    //       return;
    //     }
    //     if (interaction.member.voice.channel?.isVoiceBased()) console.log(interaction.member.voice.channel.members);
    // }

    if (client.music.player.pause(true)) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Paused the Music Player")
            .setDescription(
              `The Song [${client.music.queue[0].title}](${client.music.queue[0].url}) has been successfully paused. Use \`/resume\` to start from where you left again.`
            )
            .setTimestamp()
            .setColor("Yellow")
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });

      interaction.client.user.setActivity();
    } else
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Failed to Pause the Music")
            .setTimestamp()
            .setColor("Red")
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });
  },
};
