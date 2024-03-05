import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show List of Commands"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const ai = new EmbedBuilder()
      .setAuthor({ name: "Help" })
      .setTitle("AI Commands")
      .setDescription(
        "Commands that can be used to interact with Google's Gemini AI through Frieren"
      )
      .addFields(
        {
          name: "</ask:1207906464417587230>",
          value:
            "Ask AI to perform a task for you with support for an optional parameter to add image for extra context",
        },
        {
          name: "</imgtotext:1210963976960086016>",
          value:
            "Ask AI to extract text from an image like an OCR. Additional instructions can be added to provide AI with more context",
        }
      );

    const music = new EmbedBuilder()
      .setAuthor({ name: "Help" })
      .setTitle("Music Commands")
      .setDescription(
        "Commands that can be used to interact with Voice Player to play any song or video in audio-only form"
      )
      .setFields(
        {
          name: "</playmusic:1213435674032869376>",
          value: "Plays a song using its name or YouTube link",
        },
        {
          name: "</pause:1213781312742236220>",
          value: "Pauses the Voice Player",
        },
        {
          name: "</queue:1213706262739558430>",
          value: "Get a List of songs that are in the music queue",
        },
        {
          name: "</resume:1213706262739558431>",
          value: "Resumes a Paused Voice Player",
        },
        {
          name: "</skip:1213715973752889406>",
          value: "Skips the currently playing song",
        },
        {
          name: "</stop:1213435943495798804>",
          value:
            "Stops the Voice Player completely and clears the Music Queue.",
        },
        {
          name: "</useplaylist:1214260621378584616>",
          value:
            "Adds all the songs that are in your playlist to the music queue.",
        }
      );

    const study = new EmbedBuilder()
      .setAuthor({ name: "Help" })
      .setTitle("Study Commands")
      .setDescription(
        "Commands that can be used to manage a Topic and it's notes through Frieren"
      )
      .addFields(
        {
          name: "</createtopic:1168835596689616896>",
          value:
            "Creates a new topic with an optional parameter to add the first image",
        },
        {
          name: "</gettopic:1170287431749214208>",
          value:
            "Get a list of all topics or Use the optional parameter to get a topic using its ID",
        }
      );

    const utility = new EmbedBuilder()
      .setAuthor({ name: "Help" })
      .setTitle("Utility Commands")
      .setDescription(
        "Commands that can be used to get information about the Bot"
      )
      .addFields(
        {
          name: "</help:1214176670706307122>",
          value: "Replies with Information about all the Bot's commands",
        },
        {
          name: "</ping:1168822228352253994>",
          value: "Replies with Bot's Latency, Uptime and WebSocket Ping",
        }
      );
    await interaction.editReply({ embeds: [ai] });

    const selection =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("helpMenu")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("AI Commands")
              .setDescription(
                "Commands that can be used to interact with Google's Gemini AI through Frieren"
              )
              .setEmoji("🤖")
              .setValue("aicomm"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Music Commands")
              .setDescription(
                "Commands that can be used to interact with Voice Player to play any song or video in audio-only form"
              )
              .setEmoji("🎶")
              .setValue("musiccomm"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Study Commands")
              .setDescription(
                "Commands that can be used to manage a Topic and it's notes through Frieren"
              )
              .setEmoji("📚")
              .setValue("studycomm"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Utility Commands")
              .setDescription(
                "Commands that can be used to get information about the Bot"
              )
              .setEmoji("🛠️")
              .setValue("utilcomm")
          )
      );

    const msg = await interaction.editReply({
      embeds: [ai],
      components: [selection],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30000,
      componentType: ComponentType.StringSelect,
    });

    collector.on("collect", async (i) => {
      if (i.values[0] === "aicomm") await i.update({ embeds: [ai] });
      else if (i.values[0] === "musiccomm") await i.update({ embeds: [music] });
      else if (i.values[0] === "studycomm") await i.update({ embeds: [study] });
      else if (i.values[0] === "utilcomm") await i.update({ embeds: [utility] });
    });
    collector.on("end", async () => {
        selection.components[0].setDisabled(true);
        await interaction.editReply({ components: [selection] });
    });
  },
};
