import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Frieren } from "../../../Frieren";
import { setWordGuild } from "../../../components/Words";
import { embedError } from "../../../components/EmbedTemplate";
import { EmbedBuilder } from "@discordjs/builders";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getdailywords")
    .setDescription("Subscribe to Daily Random Word")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where you would like to receive messages")
        .setRequired(true)
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel", true);

    if (!(channel instanceof TextChannel)) {
      await interaction.editReply({
        embeds: [embedError("Given Channel is not a text channel.")],
      });
      return;
    }
    if (!interaction.guild || !interaction.guild.members.me) {
      await interaction.editReply({
        embeds: [embedError("Unable to get info about the guild")],
      });
      return;
    }

    try {
      await channel.fetch(true);
      if (
        !channel
          .permissionsFor(interaction.guild.members.me)
          .has("SendMessages")
      )
        throw new Error("No Write Access");
    } catch (ex) {
      console.log(ex);
      await interaction.editReply({
        embeds: [
          embedError(
            "The bot needs to have write access of the channel to send daily message."
          ),
        ],
      });
      return;
    }

    const res = await setWordGuild(client.dbPool, channel.guildId, channel.id);
    if (res instanceof Error) {
      await interaction.editReply({ embeds: [embedError(res.message)] });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Successfully Subscribed to Daily Word... Newsletter? idk ")
          .setDescription(
            "Your will receive a new word and its meaning everyday at 6:00 AM (GMT +5.30)."
          ),
      ],
    });
  },
};
