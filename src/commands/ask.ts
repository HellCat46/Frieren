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
    const result = await model.generateContentStream(prompt);
    let res = "";
    let linecount = 1;
    
    for await (const chunk of result.stream){
      const chunktxt = chunk.text();
      res += chunktxt;

      if(chunktxt.includes('\n')){
        await interaction.editReply(`Chunk ${linecount++} Received...`);
      }
    }

    const embed = new EmbedBuilder().setTitle(prompt).setDescription(res).setColor("Blue");

    await interaction.editReply({content: "", embeds : [embed]});
  },
};
