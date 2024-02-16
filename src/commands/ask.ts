import { Part } from "@google/generative-ai";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandAttachmentOption,
} from "discord.js";
import { readFileSync } from "fs";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Takes the prompt and asks AI")
    .addStringOption((options: SlashCommandStringOption) =>
      options
        .setName("prompt")
        .setDescription("Thing you want to ask")
        .setRequired(true)
    )
    .addAttachmentOption((option: SlashCommandAttachmentOption) =>
      option
        .setName("imgprompt")
        .setDescription("Prompt the AI using an Image.")
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString("prompt", true);
    const imgPrompt = interaction.options.getAttachment("imgprompt", false);   

    let imgPart : string | Part;
    if(imgPrompt != null && imgPrompt.contentType != null) {
      const res = await fetch(imgPrompt.url);
      imgPart = {inlineData : {data : Buffer.from(await res.arrayBuffer()).toString("base64"), mimeType : imgPrompt.contentType}};
    }else{
      imgPart = "";
    }


    const model = interaction.client.genAI.getGenerativeModel({
      model: imgPrompt !== null ? "gemini-pro-vision" : "gemini-1.0-pro",
    });
    const result = await model.generateContentStream([prompt, imgPart]);


    let res = "";
    let linecount = 1;
    for await (const chunk of result.stream) {
      const chunktxt = chunk.text();
      res += chunktxt;

      if (chunktxt.includes("\n")) {
        await interaction.editReply(`Chunk ${linecount++} Received...`);
      }
    }


    let embed = new EmbedBuilder()
      .setDescription(res)
      .setColor("Blue");
    if(imgPrompt !== null) embed.setImage(imgPrompt.url);

    await interaction.editReply({ content: "", embeds: [embed] });

    
  },
};

