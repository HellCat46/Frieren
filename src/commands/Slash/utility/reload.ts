import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder,
  codeBlock,
} from "discord.js";
import { Frieren } from "../../../Frieren";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reloads Bot's Interaction Collection"),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    await client.application?.fetch();
    if (interaction.user.id !== client.application?.owner?.id) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You aren't allowed to perform this action.")
            .setDescription("Only Bot Owner can perform this action.")
            .setColor("DarkRed"),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Fetching all the Interactions...")
          .setDescription("This might take a while.")
          .setColor("Yellow"),
      ],
    });

    try {
      const start = Date.now();
      client.updateInteractionCollection();
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Successfully Reloaded the Interaction Collections.")
            .setDescription(
              "Command and Button Interaction Collections are successfully updated."
            )
            .setColor("Green")
            .setTimestamp()
            .setFooter({
              text: `Took ${(Date.now() - start) / 1000} seconds.`,
            }),
        ],
      });
    } catch (err) {
      console.error(err);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Failed to Reload the Interaction Collections")
            .setDescription(codeBlock("" + err)),
        ],
      });
    }
  },
};
