import { Events, Interaction } from "discord.js";
import { ModalEvents } from "./Interactions/Modals";
module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    if (interaction.isAutocomplete()) return;
    try {
      if (interaction.isModalSubmit()) await ModalEvents(interaction);
      else if (interaction.isButton()) {
        const topicId = +interaction.customId.split(".")[0]; // Parses Topic Id from customId of Button
        const topic = interaction.client.Topics.get(topicId);
        if (!topic) return; // If topic with the id exist or not

        const embed = interaction.message.embeds[0]; // The main embed shown to user

        const button = interaction.client.buttons.get(
          interaction.customId.split(".")[1]
        );
        if (!button) return;
        await button.execute({
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
        const command = interaction.client.commands.get(
          interaction.commandName
        );
        if (!command) return;
        await command.execute(interaction);
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  },
};
