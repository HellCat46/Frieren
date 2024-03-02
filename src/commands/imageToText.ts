import { Part } from "@google/generative-ai";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandAttachmentOption,
} from "discord.js";
import { embedError } from "../components/EmbedTemplate";
module.exports = {
  data: new SlashCommandBuilder()
    .setName("imgtotext")
    .setDescription("OCR with Gemini AI")
    .addAttachmentOption((option: SlashCommandAttachmentOption) =>
      option
        .setName("img")
        .setDescription("Image you want text from.")
        .setRequired(true)
    )
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName("instructions")
        .setDescription("Additional Instructions for AI")
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const img = interaction.options.getAttachment("img", true);
    const instructions = interaction.options.getString("instructions", false);

    if (img.contentType == null) {
      await interaction.reply("Bad");
      return;
    }

    let res = "";
    try {
      const imgBlob = await fetch(img.url);
      const imgPart: Part = {
        inlineData: {
          data: Buffer.from(await imgBlob.arrayBuffer()).toString("base64"),
          mimeType: img.contentType,
        },
      };

      const model = interaction.client.genAI.getGenerativeModel({
        model: img !== null ? "gemini-pro-vision" : "gemini-1.0-pro",
      });
      const result = await model.generateContentStream([
        `Extract Content from the Image. ${
          instructions == null ? "" : "Additional Instructions: " + instructions
        }`,
        imgPart,
      ]);

      let linecount = 1;
      for await (const chunk of result.stream) {
        const chunktxt = chunk.text();
        res += chunktxt;

        if (chunktxt.includes("\n")) {
          await interaction.editReply(`Chunk ${linecount++} Received...`);
        }
      }
    } catch (ex) {
      if (ex instanceof Error) {
        await interaction.editReply({embeds: [embedError(ex.message)]});
        return;
      } else throw ex;
    }


    await interaction.editReply({
      content: "",
      embeds: [
        new EmbedBuilder().setImage(img.url).setColor("Red"),
        new EmbedBuilder().setDescription(res).setColor("Blue"),
      ],
    });
  },
};
