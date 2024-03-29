import { Client, Events, Interaction } from "discord.js";
import { embedError } from "../components/EmbedTemplate";
import { Frieren } from "../Frieren";
module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(client: Frieren,interaction: Interaction) {
    if (interaction.isAutocomplete()) return;
    try {
      if (interaction.isButton()) {
        const topicId = +interaction.customId.split(".")[0]; // Parses Topic Id from customId of Button
        const topic = client.Topics.get(topicId);
        if (!topic) return; // If topic with the id exist or not

        const embed = interaction.message.embeds[0]; // The main embed shown to user
        const button = client.buttons.get(
          interaction.customId.split(".")[1]
        );
        if (!button) return;
        
        await button.execute(client, {
          interaction,
          embed,
          topic: {
            id: topicId,
            name: topic.name,
            page_count: topic.page_count,
            status: topic.status,
            archive_link: topic.archive_link,
          },
        });
      } else if (interaction.isChatInputCommand()) {
        const command = client.commands.get(
          interaction.commandName
        );
        if (!command) return;
        await command.execute(client, interaction);
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [embedError("There was an error while executing this command!")],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [embedError("There was an error while executing this command!")],
          ephemeral: true,
        });
      }
    }
  },
};
