import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonInteraction,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { secondsToString } from "../../../components/musicPlayer";
import { Frieren } from "../../../Frieren";
import {
  embedError,
  songsToEmbedPages,
} from "../../../components/EmbedTemplate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Get Queue of Music"),

  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const musicQueue = client.music.queue;

    // If Nothing is playing
    if (musicQueue.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Queue is completely empty")
            .setDescription(
              "use `/playmusic` command to add music to the queue"
            )
            .setColor("Red"),
        ],
      });
      return;
    }

    // Creates Embed and adds currenlty playing song in the embed list
    const queueEmbed = new EmbedBuilder()
      .setTitle("List of Music in the Queue.")
      .setColor("Random")
      .setTimestamp();

    // Responds with Embed with no pagination
    if (musicQueue.length <= 25) {
      queueEmbed.addFields({
        value: `Song Duration: ${secondsToString(
          musicQueue[0].length
        )} \n[**Link**](${musicQueue[0].url})`,
        name: `${musicQueue[0].title} (Currently Playing)`,
      });
      // Adds rest of Songs in the embed list
      for (let idx = 1; idx < musicQueue.length; idx++) {
        queueEmbed.addFields({
          value: `${secondsToString(musicQueue[idx].length)} \n[**Link**](${
            musicQueue[idx].url
          })`,
          name: `${musicQueue[idx].title}`,
        });
      }

      await interaction.editReply({ embeds: [queueEmbed] });
      return;
    }

    const pages = songsToEmbedPages(musicQueue);
    pages[0][0].name += "(Currently Playing)";
    queueEmbed.setFields(pages[0]);
    queueEmbed.setFooter({ text: `1 of ${pages.length}` });

    const msg = await interaction.editReply({
      embeds: [queueEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("back")
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("forw")
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary)
        ),
      ],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
      //componentType: ComponentType.Button
    });

    collector.on("collect", async (i) => {
      if (!i.isButton()) return;

      const pageStr = queueEmbed.data.footer?.text.split(" ")[0];
      if (pageStr == undefined) return;

      let pageno = +pageStr;
      if (i.customId === "back") {
        if (pageno <= 1) return;

        pageno--;
        queueEmbed.setFields(pages[pageno - 1]);
        queueEmbed.setFooter({ text: `${pageno} of ${pages.length}` });
        await i.update({ embeds: [queueEmbed] });
      } else if (i.customId === "forw") {
        if (pageno >= pages.length) return;

        pageno++;
        queueEmbed.setFields(pages[pageno - 1]);
        queueEmbed.setFooter({ text: `${pageno} of ${pages.length}` });
        await i.update({ embeds: [queueEmbed] });
      }
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
