import {
  Events,
  Interaction,
} from "discord.js";
import {ButtonEvents} from "./Interactions/Buttons";
import { ModalEvents } from "./Interactions/Modals";

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    if (interaction.isButton()) {
      await ButtonEvents(interaction);
    }else if(interaction.isModalSubmit()){
      await ModalEvents(interaction);
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
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
