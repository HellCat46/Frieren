import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Takes the prompt and asks AI")
    .addStringOption((options: SlashCommandStringOption) =>
      options
        .setName("prompt")
        .setDescription("Thing you want to ask")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString("prompt", true);

    const model = interaction.client.genAI.getGenerativeModel({model : "gemini-1.0-pro"});
    const result = await model.generateContent(prompt);
    const res = result.response.text();

    const embed = new EmbedBuilder().setTitle(prompt).setDescription(res);

    await interaction.editReply({embeds : [embed]});
  },
};
