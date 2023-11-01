import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandAttachmentOption,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createtopic")
    .setDescription("Creates a new topic for notes")
    .addStringOption((options : SlashCommandStringOption) => 
                                options.setName("name")
                                    .setDescription("Name of Topic")
                                    .setRequired(true)
    )
    .addAttachmentOption((options : SlashCommandAttachmentOption) => 
                                options.setName("notes")
                                .setDescription("First Page of Notes")
                                .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    console.log(interaction.options.get("notes"));

    
    let embed = new EmbedBuilder()
      .setTitle(`Notes Topic: ${interaction.options.get("name")?.value}`)
      .setImage(`${interaction.options.get("notes")?.attachment?.url}`);

    
    await interaction.reply({ content: "", embeds: [embed] });
  },
};

// // {
//   name: 'notes',
//   type: 11,
//   value: '1168845957182537768',
//   attachment: Attachment {
//     attachment: 'https://cdn.discordapp.com/ephemeral-attachments/1168835596689616896/1168845957182537768/httpmsgstructure2.png?ex=65533fa0&is=6540caa0&hm=450bc366aa244d9203c30c7df5c98e64d6a89056dcbc0558c9fdbc7d141e2562&',
//     name: 'httpmsgstructure2.png',
//     id: '1168845957182537768',
//     size: 19429,
//     url: 'https://cdn.discordapp.com/ephemeral-attachments/1168835596689616896/1168845957182537768/httpmsgstructure2.png?ex=65533fa0&is=6540caa0&hm=450bc366aa244d9203c30c7df5c98e64d6a89056dcbc0558c9fdbc7d141e2562&',
//     proxyURL: 'https://media.discordapp.net/ephemeral-attachments/1168835596689616896/1168845957182537768/httpmsgstructure2.png?ex=65533fa0&is=6540caa0&hm=450bc366aa244d9203c30c7df5c98e64d6a89056dcbc0558c9fdbc7d141e2562&',
//     height: 368,
//     width: 1239,
//     contentType: 'image/png',
//     description: null,
//     ephemeral: true,
//     duration: null,
//     waveform: null,
//     flags: AttachmentFlagsBitField { bitfield: 0 }
//   }
// }