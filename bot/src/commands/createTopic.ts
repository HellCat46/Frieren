import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandAttachmentOption,
} from "discord.js";
import { createTopic, getPageLink } from "../components/Requests";
import { embedError, embedTopic} from "../components/EmbedTemplate"

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createtopic")
    .setDescription("Creates a new topic for notes")
    .addStringOption((options : SlashCommandStringOption) => 
                                options.setName("name")
                                    .setDescription("Name of Topic")
                                    .setMaxLength(50)
                                    .setRequired(true))
    .addAttachmentOption((options : SlashCommandAttachmentOption) => 
                                options.setName("notes")
                                .setDescription("First Page of Notes")
                                .setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction ) {
    await interaction.deferReply();

    const topicName = interaction.options.getString("name", true)
    const page = interaction.options.getAttachment("notes");
    let res : {id : number, msg : string}; 

    if(!page) {
      res = await createTopic(topicName);
      if(res.id == -1) {
        await interaction.editReply({embeds : [embedError(res.msg)]})
      }else {
        const message = embedTopic(res.id, topicName);
        interaction.options.client.Topics.set(res.id, {
          name: topicName,
          page_count: 0,
        });
        await interaction.editReply({embeds : [message.embed], components : message.rows.slice(1)})
      }

      return;
    }

    res = await createTopic(topicName, page.url);
    if(res.id == -1){
      await interaction.editReply({ embeds : [embedError(res.msg)]});
      return;
    }

    const link = await getPageLink(+res.id, 1);
    if(!link.startsWith("http")){
      await interaction.editReply({embeds : [embedError(link)]});
      return;
    }
    
    const message = embedTopic(res.id, topicName, "1 of 1", link);
    interaction.options.client.Topics.set(res.id, {name : topicName, page_count : 1});
    
    await interaction.editReply({embeds: [message.embed], components :message.rows});
  },
};