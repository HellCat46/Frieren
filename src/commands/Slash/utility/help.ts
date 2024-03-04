import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

module.exports = {
    data : new SlashCommandBuilder().setName("help").setDescription("Show List of Commands"),
    async execute(interaction : ChatInputCommandInteraction){
        
    }
}