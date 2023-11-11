import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export function embedError(message : string){
    return new EmbedBuilder().setDescription(message).setColor("#FF9494");
}

export function embedTopic(id: number, topicName : string, footer ?: string, imageurl ?: string){
    let embed = new EmbedBuilder().setTitle(`${id}. ${topicName}`);

    if(footer) embed.setFooter({text : footer});
    if(imageurl) embed.setImage(imageurl);

    const move = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${id}.back`)
        .setLabel("Back")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`${id}.select`)
        .setLabel("Enter Page No.")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`${id}.forward`)
        .setLabel("Forward")
        .setStyle(ButtonStyle.Primary)
    );

    const manage = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${id}.add`)
        .setLabel("Add Page")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`${id}.remove`)
        .setLabel("Remove Page")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${id}.refresh`)
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Primary)
    );

    const advance = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${id}.advance`)
        .setLabel("Advance Options")
        .setStyle(ButtonStyle.Primary)
    );
    return {embed : embed, rows :  [move, manage, advance]};
}