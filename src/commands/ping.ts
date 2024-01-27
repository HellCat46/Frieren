import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Returns latency and ping"),
  async execute(interaction: CommandInteraction) {
    let embed = new EmbedBuilder()
      .setTitle(":sparkles: Numbers :sparkles:")
      .setDescription(
        `
        **Bot Latency**: *${Date.now() - interaction.createdTimestamp} ms* 
        **Websocket Ping**: *${interaction.client.ws.ping} ms*
        **Started**: <t:${Math.floor((Date.now() - interaction.client.uptime)/1000)}:R>` 
      );
    await interaction.reply({ content: "", embeds: [embed] });
  },
};
