import {ActionRowBuilder, ButtonInteraction, Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

module.exports = {
    name : Events.InteractionCreate,
    once : false,
    async execute(interaction : Interaction){
          if(interaction.isButton()){
            interaction = interaction as ButtonInteraction;
            let id = interaction.customId; 
            console.log(id);
            console.log(interaction.client.Topics)
            for(let i =0; i<  interaction.client.Topics.length; i++){
              console.log(interaction.client.Topics[i]);
              if (id.startsWith(interaction.client.Topics[i])) {
                if (id.endsWith("back")) {
                  interaction.editReply("Back");
                } else if (id.endsWith("select")) {
                  const input = new TextInputBuilder().setCustomId(interaction.client.Topics[i]+"page")
                                    .setLabel("Enter Page number")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder("1-10")
                                    .setValue("2");           

                  const actionrow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
                  const modal = new ModalBuilder().setCustomId(interaction.client.Topics[i]).setTitle("Page No.").addComponents(actionrow);
                  
                  await interaction.showModal(modal);
                } else if (id.endsWith("forward")) {
                  interaction.editReply("Forward");
                } else if (id.endsWith("add")) {
                  interaction.editReply("Add");
                } else if (id.endsWith("remove")) {
                  interaction.editReply("Remove");
                } else if (id.endsWith("advance")) {
                  interaction.editReply("Advance");
                }
                break;
              }
            }
            return;
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
    }
}