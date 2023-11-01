import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandAttachmentOption,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
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
  async execute(interaction: ChatInputCommandInteraction ) {
    await interaction.deferReply();

    let topicName = interaction.options.getString("name", true)
    //console.log(interaction.options.getAttachment("notes"))

    if(topicName.includes("->")){
      await interaction.editReply("Not allowed. Use =>");
      return;
    }

    let page = interaction.options.getAttachment("notes");

    interaction.options.client.Topics.push(topicName);
    let embed;
    if(page){
      embed = new EmbedBuilder()
      .setTitle(`Notes Topic: ${topicName}`)
      .setImage(`${page.url}`);
    }else {
      embed = new EmbedBuilder()
      .setTitle(`Notes Topic : ${topicName}`)
    }

    const move = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${topicName}->back`)
        .setLabel("Back")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`${topicName}->select`)
        .setLabel("Enter Page No.")
        .setStyle(ButtonStyle.Secondary),
  
      new ButtonBuilder()
        .setCustomId(`${topicName}->forward`)
        .setLabel("Forward")
        .setStyle(ButtonStyle.Primary),
    );

    const manage = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${topicName}->add`)
        .setLabel("Add Page")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`${topicName}->remove`)
        .setLabel("Remove Page")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`${topicName}->advance`)
        .setLabel("Advance Options")
        .setStyle(ButtonStyle.Primary),
    );


    await interaction.editReply({ content: "", embeds: [embed], components : [move, manage]});
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