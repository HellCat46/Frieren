import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { addPage, getPageLink, removePage } from "../../components/Requests";
import { embedError } from "../../components/EmbedTemplate";

export async function ButtonEvents(interaction: ButtonInteraction) {
  const id = interaction.customId;
  const key = +id.split(".")[0];
  const topic = interaction.client.Topics.get(key);
  if (!topic) return;

  const inbed = interaction.message.embeds[0];

  if (id.endsWith("back")) {
    if (!inbed.footer) {
      await interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }
    const pageno = +inbed.footer.text.split(" ")[0] - 1;
    if (0 >= pageno) {
      await interaction.reply({
        embeds: [embedError("You are already looking at first page")],
        ephemeral: true,
      });
      return;
    }

    const link = await getPageLink(key, pageno);
    if (!link.startsWith("http")) {
      await interaction.reply({
        embeds: [embedError(link)],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(inbed.title)
      .setImage(link)
      .setFooter({ text: `${pageno} of ${topic.page_count}` });

    await interaction.update({
      embeds: [embed],
      components: interaction.message.components,
    });
  } else if (id.endsWith("select")) {
    if (!inbed.footer) {
      await interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }
    const actionrow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("pageno")
        .setLabel("Enter Page number")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`1-${topic.page_count}`)
        .setValue(inbed.footer.text.split(" ")[0])
    );
    const modal = new ModalBuilder()
      .setCustomId(`${key}.pagemodal`)
      .setTitle("Page No.")
      .addComponents(actionrow);
    await interaction.showModal(modal);
  } else if (id.endsWith("forward")) {
    if (!inbed.footer) {
      await interaction.reply({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }
    const pageno = +inbed.footer.text.split(" ")[0] + 1;
    if (topic.page_count < pageno) {
      await interaction.reply({
        embeds: [embedError("You are already looking at last page")],
        ephemeral: true,
      });
      return;
    }

    const link = await getPageLink(key, pageno);
    if (!link.startsWith("http")) {
      await interaction.reply({ embeds: [embedError(link)], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(inbed.title)
      .setImage(link)
      .setFooter({ text: `${pageno} of ${topic.page_count}` });

    await interaction.update({
      embeds: [embed],
      components: interaction.message.components,
    });
  } else if (id.endsWith("add")) {
    let embed = new EmbedBuilder()
      .setTitle("Image Collector")
      .setDescription("You have 1 minute to send all pages you want to add.");
    if (!interaction.channel) return;
    await interaction.deferReply();
    await interaction.followUp({ embeds: [embed] });

    const collector = interaction.channel.createMessageCollector({
      time: 60000,
    });

    let count = topic.page_count;
    collector.on("collect", (msg) => {
      if (msg.attachments) {
        msg.attachments.forEach(async (attachment) => {
          const res = await addPage(key, attachment.url);
          if (typeof res === "number") {
            count = res;
            await interaction.followUp({
              content: `${count}`,
              ephemeral: true,
            });
          } else {
            await interaction.followUp({
              embeds: [embedError("Error while adding some of the images...")],
              ephemeral: true,
            });
            return;
          }
        });
      }
    });
    collector.on("end", async (collection) => {
      console.log(`Collected ${collection.size} items`);
      collection.forEach((msg) => msg.delete());
      await interaction.deleteReply();
      await interaction.followUp({
        embeds: [embed.setDescription("Timer Ended")],
        ephemeral: true,
      });

      interaction.client.Topics.set(key, {
        name: topic.name,
        page_count: count,
      });

      // await interaction.update({
      //   embeds: [
      //     EmbedBuilder.from(inbed).setFooter({
      //       text: `${1} of ${count}`,
      //     }),
      //   ],
      //   components : interaction.message.components
      // });
    });
  } else if (id.endsWith("remove")) {
    if (!inbed.footer || topic.page_count == 0) {
      await interaction.followUp({
        embeds: [embedError("No pages")],
        ephemeral: true,
      });
      return;
    }

    const pageno = inbed.footer.text.split(" ")[0];
    const res = await removePage(key, pageno);
    if (res != 0) {
      await interaction.followUp({
        embeds: [embedError(`${res}`)],
        ephemeral: true,
      });
      return;
    }

    topic.page_count--;
    interaction.client.Topics.set(key, {
      name: topic.name,
      page_count: topic.page_count,
    });
    if (topic.page_count == 0) {
      interaction.update({
        embeds: [EmbedBuilder.from(inbed).setImage(null).setFooter(null)],
        components: [interaction.message.components[1]],
      });
      return;
    }

    interaction.update({
      embeds: [
        EmbedBuilder.from(inbed)
          .setImage(await getPageLink(key, +pageno))
          .setFooter({
            text: `${pageno} of ${topic.page_count}`,
          }),
      ],
      components: interaction.message.components,
    });
  } else if (id.endsWith("advance")) {
    const embed = new EmbedBuilder()
      .setTitle("Advance Options")
      .setDescription("These options are only available for limited users.")
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1067033740154519612/1171085332565995630/memed-io-output.jpeg"
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Open")
        .setCustomId(`${key}.open`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setLabel("Close")
        .setCustomId(`${key}.close`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Delete")
        .setCustomId(`${key}.delete`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("Archive")
        .setCustomId(`${key}.archive`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("PDF Link")
        .setStyle(ButtonStyle.Link)
        .setURL("https://youtu.be/dQw4w9WgXcQ?si=n1_Z0PYpWv6U75J4")
    );
    interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
}
