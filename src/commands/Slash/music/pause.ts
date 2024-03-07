import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice } from "../../../components/musicPlayer";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the Music Player"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

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

    if (interaction.client.music.player.pause(true)){
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Paused the Music Player")
            .setDescription(
              `The Song [${interaction.client.music.queue[0].title}](${interaction.client.music.queue[0].url}) has been successfully paused. Use \`/resume\` to start from where you left again.`
            )
            .setTimestamp()
            .setColor("Yellow")
            .setFooter({ text: `Request By: ${interaction.user.username}` }),
        ],
      });

      interaction.client.user.setActivity();
    }
    else
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
