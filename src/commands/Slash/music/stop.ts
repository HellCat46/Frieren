import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { isInVoice, stopMusic } from "../../../components/musicPlayer";
import { embedError } from "../../../components/EmbedTemplate";
import { getVoiceConnection } from "@discordjs/voice";
import { Frieren } from "../../../Frieren";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops Anything playing and disconnects the bot."),

  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Checks for user being in same channel as Bot
    const isUsingVoice = isInVoice(interaction);
    if (isUsingVoice instanceof EmbedBuilder) {
      await interaction.editReply({ embeds: [isUsingVoice] });
      return;
    }

    if (interaction.guildId == null) {
      await interaction.editReply({
        embeds: [
          embedError("Unable to retrieve enough info to perform this action."),
        ],
      });
      return;
    }

    // Sends A Embed for Confirmation
    // then Wait for Requester to click on one of the buttons
    // If none are clicked in 30 Sec then Embed will expire and music wouldn't be stopped.
    const res = await (
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Do you want to stop the music player?")
            .setDescription(
              "There will remove all the songs from music queue and disconnect the bot from VC channel."
            )
            .setColor("DarkGrey")
            .setTimestamp()
            .setFooter({ text: "This Prompt will expire after 30 Seconds." }),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId("stopMusicYes")
                .setLabel("Yes")
                .setStyle(ButtonStyle.Danger)
            )
            .addComponents(
              new ButtonBuilder()
                .setCustomId("stopMusicNo")
                .setLabel("No")
                .setStyle(ButtonStyle.Primary)
            ),
        ],
      })
    )
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 30000,
      })
      .then((i) => i.customId)
      .catch(() => null);

    if (res == null) {
      await interaction.editReply({
        content: "Timer Ended.",
        components: [],
        embeds: [],
      });
      return;
    }

    if (res === "stopMusicNo") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("User cancel the operation.")
            .setTimestamp(),
        ],
        components: [],
      });
      return;
    }

    stopMusic(client, interaction.guildId);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Successfully Stopped the Music Player")
          .setDescription(
            "The Queue has been cleared and Bot will be disconnected soon."
          )
          .setTimestamp()
          .setFooter({ text: `Request By: ${interaction.user.username}` }),
      ],
      components: [],
    });
  },
};
