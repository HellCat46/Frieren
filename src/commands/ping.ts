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
    const start_api = Date.now();
    // const _ = await fetch(interaction.client.api_url);
    const end_api = Date.now();

    const start_filer = Date.now();
    // const a = await fetch(interaction.client.api_url);
    const end_filer = Date.now();

    let embed = new EmbedBuilder()
      .setTitle(":sparkles: Numbers :sparkles:")
      .setDescription(
        `
        **API**: *${end_api - start_api} ms*
        **File Service** : *${end_filer - start_filer} ms*
        **Bot Latency**: *${Date.now() - interaction.createdTimestamp} ms* 
        **Websocket Ping**: *${interaction.client.ws.ping} ms*
        **Started**: <t:${Math.floor((Date.now() - interaction.client.uptime)/1000)}:R>` 
      );
    await interaction.reply({ content: "", embeds: [embed] });
  },
};
