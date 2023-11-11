import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,

} from "discord.js";
import { addPage, getPageLink, removePage } from "../../components/Requests";
import { embedError, embedTopic } from "../../components/EmbedTemplate";
import { randomInt } from "node:crypto";

export async function ButtonEvents(interaction: ButtonInteraction) {
  const topicId = +interaction.customId.split(".")[0]; // Parses Topic Id from customId of Button
  const topic = interaction.client.Topics.get(topicId);
  if (!topic) return; // If topic with the id exist or not

  const inbed = interaction.message.embeds[0]; // The main embed shown to user

  try {
    switch (interaction.customId.split(".")[1]) {
      case "back":
        {
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

          const link = await getPageLink(
            interaction.client.api_url,
            topicId,
            pageno
          );
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
        }
        break;
      case "select":
        {
          if (!inbed.footer) {
            await interaction.reply({
              embeds: [embedError("No pages")],
              ephemeral: true,
            });
            return;
          }
          const actionrow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("pageno")
                .setLabel("Enter Page number")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`1-${topic.page_count}`)
                .setValue(inbed.footer.text.split(" ")[0])
            );
          const modal = new ModalBuilder()
            .setCustomId(`${topicId}.pagemodal`)
            .setTitle("Page No.")
            .addComponents(actionrow);
          await interaction.showModal(modal);
          
        }
        break;
      case "forward":
        {
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

          const link = await getPageLink(
            interaction.client.api_url,
            topicId,
            pageno
          );
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
        }
        break;
      case "add":
        {
          if (!interaction.channel) return;
          const pin = randomInt(111111, 999999);
          let embed = new EmbedBuilder()
            .setTitle("Image Collector")
            .setDescription(
              "You have 2 minute to send all pages you want to add."
            )
            .setFooter({
              text: `Type \`STOP ${pin}\` to end collector immediately.`,
            });

          await interaction.deferReply();
          await interaction.followUp({ embeds: [embed] });

          const collector = interaction.channel.createMessageCollector({
            time: 120000,
          });
          let count = topic.page_count;
          collector.on("collect", async (msg) => {
            if (interaction.user.id != msg.author.id || !msg.attachments)
              return;
            if (msg.content == `STOP ${pin}`) {
              collector.stop("Requested by user");
              msg.delete();
              return;
            }

            for (const attachment of msg.attachments) {
              const res = await addPage(
                interaction.client.api_url,
                topicId,
                attachment[1].url
              );

              if (typeof res === "string") {
                await interaction.followUp({
                  embeds: [
                    embedError("Error while adding some of the images..."),
                  ],
                  ephemeral: true,
                });
                return;
              }
              count = res;
            }
            msg.delete();
          });
          collector.on("end", async () => {
            await interaction.deleteReply();
            await interaction.followUp({
              embeds: [embed.setDescription("Timer Ended").setFooter(null)],
              ephemeral: true,
            });

            interaction.client.Topics.set(topicId, {
              name: topic.name,
              page_count: count,
            });

            await interaction.message.edit({
              embeds: [
                EmbedBuilder.from(inbed)
                  .setImage(
                    await getPageLink(interaction.client.api_url, topicId, 1)
                  )
                  .setFooter({
                    text: `${1} of ${count}`,
                  }),
              ],
              components: interaction.message.components,
            });
          });
        }
        break;
      case "remove":
        {
          await interaction.deferReply();

          if (!inbed.footer || topic.page_count == 0) {
            await interaction.followUp({
              embeds: [embedError("No pages")],
              ephemeral : true
            });
            return;
          }

          const input = await (
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Deletion Confirmation")
                  .setDescription(
                    "Do you really want to delete the currently active page?"
                  )
                  .setFooter({
                    text: "Confirmation will expire after 20 seconds",
                  }),
              ],
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setLabel("Yes")
                    .setCustomId("yes")
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setLabel("No")
                    .setCustomId("no")
                    .setStyle(ButtonStyle.Success)
                ),
              ],
            })
          )
            .awaitMessageComponent({
              filter: (click) => click.user.id == interaction.user.id,
              time: 20000,
              componentType: ComponentType.Button,
            })
            .then((value) => {
              if (value.customId == "yes") return 1;
              else return 0;
            })
            .catch(() => 0);

          await interaction.deleteReply();
          if (input == 0) {
            return;
          }

          const pageno = inbed.footer.text.split(" ")[0];
          const res = await removePage(
            interaction.client.api_url,
            topicId,
            pageno
          );
          if (res != 0) {
            await interaction.followUp({
              embeds: [embedError(`${res}`)],
              ephemeral: true,
            });
            return;
          }

          topic.page_count--;
          interaction.client.Topics.set(topicId, {
            name: topic.name,
            page_count: topic.page_count,
          });

          if (topic.page_count == 0) {
            interaction.message.edit({
              embeds: [EmbedBuilder.from(inbed).setImage(null).setFooter(null)],
              components: [interaction.message.components[1]],
            });
            return;
          }

          interaction.message.edit({
            embeds: [
              EmbedBuilder.from(inbed)
                .setImage(
                  await getPageLink(
                    interaction.client.api_url,
                    topicId,
                    +pageno
                  )
                )
                .setFooter({
                  text: `${pageno} of ${topic.page_count}`,
                }),
            ],
            components: interaction.message.components,
          });
        }
        break;
      case "refresh":
        {
          await interaction.deferReply({ ephemeral: true });
          console.log(interaction.customId);
          if (inbed.footer && topic.page_count > 0) {
            const current_page = +inbed.footer.text.split(" ")[0];
            const link = await getPageLink(
              interaction.client.api_url,
              topicId,
              current_page
            );
            if (!link.startsWith("http")) {
              await interaction.editReply({
                content: "Failed to Refresh Embed",
              });
              return;
            }

            const msg = embedTopic(
              topicId,
              topic.name,
              `${current_page} of ${topic.page_count}`,
              link
            );
            interaction.message.edit({
              embeds: [msg.embed],
              components: msg.rows,
            });
          } else if (topic.page_count > 0) {
            const link = await getPageLink(
              interaction.client.api_url,
              topicId,
              1
            );
            if (!link.startsWith("http")) {
              await interaction.editReply({
                content: "Failed to Refresh Embed",
              });
              return;
            }

            const msg = embedTopic(
              topicId,
              topic.name,
              `${1} of ${topic.page_count}`,
              link
            );
            interaction.message.edit({
              embeds: [msg.embed],
              components: msg.rows,
            });
          } else {
            const message = embedTopic(topicId, topic.name);
            await interaction.message.edit({
              embeds: [message.embed],
              components: message.rows.slice(1),
            });
          }
          await interaction.editReply({
            content: "Embed Refreshed Successfully",
          });
        }
        break;
      case "advance":
        {
          const embed = new EmbedBuilder()
            .setTitle("Advance Options")
            .setDescription(
              "These options are only available for limited users."
            )
            .setThumbnail(
              "https://cdn.discordapp.com/attachments/1067033740154519612/1171085332565995630/memed-io-output.jpeg"
            );

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Open")
              .setCustomId(`${topicId}.open`)
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setLabel("Close")
              .setCustomId(`${topicId}.close`)
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel("Delete")
              .setCustomId(`${topicId}.delete`)
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setLabel("Archive")
              .setCustomId(`${topicId}.archive`)
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
        break;
    }
  } catch (exception) {
    console.error(exception);
  }
}
