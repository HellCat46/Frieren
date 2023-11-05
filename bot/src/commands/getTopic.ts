import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { embedError, embedTopic } from "../components/EmbedTemplate";
import { getPageLink } from "../components/Requests";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gettopic")
    .setDescription("Get Embed of existing Topic")
    .addIntegerOption( (options) => options
        .setName("id")
        .setDescription("Name of the Topic")
        .setRequired(true)
    ),
    async execute(interaction : ChatInputCommandInteraction){
      await interaction.deferReply()
      const id = interaction.options.getInteger("id", true);
      const topic = interaction.client.Topics.get(id);

      if(!topic){
        await interaction.editReply({embeds : [embedError("No Topic Exists with this id")]})
        return;
      }
      if(topic.page_count == 0){
        const message = embedTopic(id, topic.name);
        await interaction.editReply({
          embeds: [message.embed],
          components: [message.row2],
        });
        return;
      }
          
      const link = await getPageLink(id, 1);
      if (!link.startsWith("http")) {
            await interaction.editReply({ embeds: [embedError(link)] });
            return;
      }
      
      const message = embedTopic(id, topic.name, `1 of ${topic.page_count}`, link)
      await interaction.editReply({embeds : [message.embed], components : [message.row1, message.row2]})
    }
};
