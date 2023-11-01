import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";

module.exports = {
    data : new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Returns latency and ping"),
    async execute(interaction : CommandInteraction){
        let embed = new EmbedBuilder()
                    .setTitle(":sparkles: Numbers :sparkles:")
                    .setDescription(`**Latency**: *${Date.now() - interaction.createdTimestamp} ms* \n**Ping**: *${interaction.client.ws.ping} ms*`);
        await interaction.reply({content: "", embeds : [embed]});
    }
}