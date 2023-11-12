import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  Embed,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  addPage,
  changeStatus,
  deleteTopic,
  getPageLink,
  removePage,
} from "../../components/Requests";
import { embedError, embedTopic } from "../../components/EmbedTemplate";
import { randomInt } from "node:crypto";
import { topicStatus } from "../../index";

interface Params {
  interaction: ButtonInteraction;
  embed: Embed;
  topic: {
    id: number;
    name: string;
    page_count: number;
    status: topicStatus;
    archive_link: string | null;
  };
}

export async function ButtonEvents(interaction: ButtonInteraction) {
  const topicId = +interaction.customId.split(".")[0]; // Parses Topic Id from customId of Button
  const topic = interaction.client.Topics.get(topicId);
  if (!topic) return; // If topic with the id exist or not

  const embed = interaction.message.embeds[0]; // The main embed shown to user

  try {
    switch (interaction.customId.split(".")[1]) {
      case "back":
        await optionBack({
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
        break;
      case "select":
        await optionSelect({
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
        break;
      case "forward":
        await optionForward({
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
        break;
      case "add":
        await optionAdd({
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
        break;
      case "remove":
        await optionRemove({
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
        break;
      case "refresh":
        await optionRefresh({
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
        break;
      case "advance":
        await optionAdvance({
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
        break;
    }
  } catch (exception) {
    console.error(exception);
  }
}

async function optionBack(params: Params) {
  if (!params.embed.footer) {
    await params.interaction.reply({
      embeds: [embedError("No pages")],
      ephemeral: true,
    });
    return;
  }

  const pageno = +params.embed.footer.text.split(" ")[0] - 1;
  if (0 >= pageno) {
    await params.interaction.reply({
      embeds: [embedError("You are already looking at first page")],
      ephemeral: true,
    });
    return;
  }

  const link = await getPageLink(
    params.interaction.client.api_url,
    params.topic.id,
    pageno
  );
  if (!link.startsWith("http")) {
    await params.interaction.reply({
      embeds: [embedError(link)],
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(params.embed.title)
    .setImage(link)
    .setFooter({ text: `${pageno} of ${params.topic.page_count}` });

  await params.interaction.update({
    embeds: [embed],
    components: params.interaction.message.components,
  });
}

async function optionSelect(params: Params) {
  if (!params.embed.footer) {
    await params.interaction.reply({
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
      .setPlaceholder(`1-${params.topic.page_count}`)
      .setValue(params.embed.footer.text.split(" ")[0])
  );
  const modal = new ModalBuilder()
    .setCustomId(`${params.topic.id}.pagemodal`)
    .setTitle("Page No.")
    .addComponents(actionrow);
  await params.interaction.showModal(modal);
}

async function optionForward(params: Params) {
  if (!params.embed.footer) {
    await params.interaction.reply({
      embeds: [embedError("No pages")],
      ephemeral: true,
    });
    return;
  }
  const pageno = +params.embed.footer.text.split(" ")[0] + 1;
  if (params.topic.page_count < pageno) {
    await params.interaction.reply({
      embeds: [embedError("You are already looking at last page")],
      ephemeral: true,
    });
    return;
  }

  const link = await getPageLink(
    params.interaction.client.api_url,
    params.topic.id,
    pageno
  );
  if (!link.startsWith("http")) {
    await params.interaction.reply({
      embeds: [embedError(link)],
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(params.embed.title)
    .setImage(link)
    .setFooter({ text: `${pageno} of ${params.topic.page_count}` });

  await params.interaction.update({
    embeds: [embed],
    components: params.interaction.message.components,
  });
}

async function optionAdd(params: Params) {
  if(params.topic.status != topicStatus.Open){
    await params.interaction.reply({embeds : [embedError("Pages can't be added into a Closed Topic")], ephemeral : true});
    return;
  }
  if (!params.interaction.channel) return;


  const pin = randomInt(111111, 999999);
  let embed = new EmbedBuilder()
    .setTitle("Image Collector")
    .setDescription("You have 2 minute to send all pages you want to add.")
    .setFooter({
      text: `Type \`STOP ${pin}\` to end collector immediately.`,
    });

  await params.interaction.deferReply();
  await params.interaction.followUp({ embeds: [embed] });

  const collector = params.interaction.channel.createMessageCollector({
    time: 120000,
  });
  let count = params.topic.page_count;
  collector.on("collect", async (msg) => {
    if (params.interaction.user.id != msg.author.id || !msg.attachments) return;
    if (msg.content == `STOP ${pin}`) {
      collector.stop("Requested by user");
      msg.delete();
      return;
    }

    for (const attachment of msg.attachments) {
      const res = await addPage(
        params.interaction.client.api_url,
        params.topic.id,
        attachment[1].url
      );

      if (typeof res === "string") {
        await params.interaction.followUp({
          embeds: [embedError("Error while adding some of the images...")],
          ephemeral: true,
        });
        return;
      }
      count = res;
    }
    msg.delete();
  });
  collector.on("end", async () => {
    await params.interaction.deleteReply();
    await params.interaction.followUp({
      embeds: [embed.setDescription("Timer Ended").setFooter(null)],
      ephemeral: true,
    });

    params.interaction.client.Topics.set(params.topic.id, {
      name: params.topic.name,
      page_count: count,
      status: params.topic.status,
      archive_link: params.topic.archive_link,
    });

    await params.interaction.message.edit({
      embeds: [
        EmbedBuilder.from(params.embed)
          .setImage(
            await getPageLink(
              params.interaction.client.api_url,
              params.topic.id,
              1
            )
          )
          .setFooter({
            text: `${1} of ${count}`,
          }),
      ],
      components: params.interaction.message.components,
    });
  });
}

async function optionRemove(params: Params) {
  if (params.topic.status != topicStatus.Open) {
    await params.interaction.reply({
      embeds: [embedError("Pages can't be removed from a Closed Topic")],
      ephemeral: true,
    });
    return;
  }
  await params.interaction.deferReply();

  if (!params.embed.footer || params.topic.page_count == 0) {
    await params.interaction.followUp({
      embeds: [embedError("No pages")],
      ephemeral: true,
    });
    return;
  }

  const input = await (
    await params.interaction.editReply({
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
      filter: (click) => click.user.id == params.interaction.user.id,
      time: 20000,
      componentType: ComponentType.Button,
    })
    .then((value) => {
      if (value.customId == "yes") return 1;
      else return 0;
    })
    .catch(() => 0);

  await params.interaction.deleteReply();
  if (input == 0) {
    return;
  }

  const pageno = params.embed.footer.text.split(" ")[0];
  const res = await removePage(
    params.interaction.client.api_url,
    params.topic.id,
    pageno
  );
  if (res != 0) {
    await params.interaction.followUp({
      embeds: [embedError(`${res}`)],
      ephemeral: true,
    });
    return;
  }

  params.topic.page_count--;
  params.interaction.client.Topics.set(params.topic.id, {
    name: params.topic.name,
    page_count: params.topic.page_count,
    status: params.topic.status,
    archive_link: params.topic.archive_link,
  });

  if (params.topic.page_count == 0) {
    await params.interaction.message.edit({
      embeds: [EmbedBuilder.from(params.embed).setImage(null).setFooter(null)],
      components: [params.interaction.message.components[1]],
    });
    return;
  }

  await params.interaction.message.edit({
    embeds: [
      EmbedBuilder.from(params.embed)
        .setImage(
          await getPageLink(
            params.interaction.client.api_url,
            params.topic.id,
            +pageno
          )
        )
        .setFooter({
          text: `${pageno} of ${params.topic.page_count}`,
        }),
    ],
    components: params.interaction.message.components,
  });
}

async function optionRefresh(params: Params) {
  await params.interaction.deferReply({ ephemeral: true });
  if (params.embed.footer && params.topic.page_count > 0) {
    const current_page = +params.embed.footer.text.split(" ")[0];
    const link = await getPageLink(
      params.interaction.client.api_url,
      params.topic.id,
      current_page
    );
    if (!link.startsWith("http")) {
      await params.interaction.editReply({
        content: "Failed to Refresh Embed",
      });
      return;
    }

    const msg = embedTopic(
      params.topic.id,
      params.topic.name,
      `${current_page} of ${params.topic.page_count}`,
      link
    );
    await params.interaction.message.edit({
      embeds: [msg.embed],
      components: msg.rows,
    });
  } else if (params.topic.page_count > 0) {
    const link = await getPageLink(
      params.interaction.client.api_url,
      params.topic.id,
      1
    );
    if (!link.startsWith("http")) {
      await params.interaction.editReply({
        content: "Failed to Refresh Embed",
      });
      return;
    }

    const msg = embedTopic(
      params.topic.id,
      params.topic.name,
      `${1} of ${params.topic.page_count}`,
      link
    );
    await params.interaction.message.edit({
      embeds: [msg.embed],
      components: msg.rows,
    });
  } else {
    const message = embedTopic(params.topic.id, params.topic.name);
    await params.interaction.message.edit({
      embeds: [message.embed],
      components: message.rows.slice(1),
    });
  }
  await params.interaction.editReply({
    content: "Embed Refreshed Successfully",
  });
}

async function optionAdvance(params: Params) {
  await params.interaction.deferReply();
  const click = await (
    await params.interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Advance Options")
          .setDescription("These options are only available for limited users.")
          .setThumbnail(
            "https://cdn.discordapp.com/attachments/1067033740154519612/1171085332565995630/memed-io-output.jpeg"
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Open")
            .setCustomId("open")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setLabel("Close")
            .setCustomId("close")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("Delete")
            .setCustomId("delete")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel("Archive")
            .setCustomId("archive")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel("PDF Link")
            .setStyle(ButtonStyle.Link)
            .setURL("https://youtu.be/dQw4w9WgXcQ?si=n1_Z0PYpWv6U75J4")
        ),
      ],
    })
  )
    .awaitMessageComponent({
      filter: (click) => click.user.id == params.interaction.user.id,
      time: 20000,
      componentType: ComponentType.Button,
    })
    .then((value) => value)
    .catch(() => null);

  await params.interaction.deleteReply();
  if (click == null) return;

  console.log(
    `${params.topic.status} == ${topicStatus.Archived} = ${
      params.topic.status == topicStatus.Archived
    }`
  );
  if (params.topic.status == topicStatus.Archived) {
    await click.reply({
      content: "Topic is archived therefore these options are not accessible.",
      ephemeral: true,
    });
    return;
  }

  await click.deferReply({ ephemeral: true });
  switch (click.customId) {
    case "open":
      {
        console.log(`${params.topic.status} == ${topicStatus.Open} = ${params.topic.status == topicStatus.Open}`)
        if (params.topic.status == topicStatus.Open) {
          await click.editReply({
            embeds: [embedError("Topic is already opened")],
          });
          return;
        }

        const result = await changeStatus(
          click.client.api_url,
          params.topic.id,
          topicStatus.Open
        );
        if (!result) {
          await click.editReply({
            embeds: [embedError("Failed to Open the topic")],
          });
          return;
        }
        click.client.Topics.set(params.topic.id, {
          name: params.topic.name,
          page_count: params.topic.page_count,
          status: topicStatus.Open,
          archive_link: params.topic.archive_link,
        });
        click.editReply("Successfully opened the Topic.");
      }
      break;
    case "close":
      {
        if (params.topic.status == topicStatus.Closed) {
          await click.editReply({
            embeds: [embedError("Topic is already closed")],
          });
          return;
        }

        const result = await changeStatus(
          click.client.api_url,
          params.topic.id,
          topicStatus.Closed
        );
        if (!result) {
          await click.editReply({
            embeds: [embedError("Failed to Close the topic")],
          });
          return;
        }
        click.client.Topics.set(params.topic.id, {
          name: params.topic.name,
          page_count: params.topic.page_count,
          status: topicStatus.Closed,
          archive_link: params.topic.archive_link,
        });
        click.editReply("Successfully Closed the Topic.");
      }
      break;
    case "archive":
      {
        const result = await changeStatus(
          click.client.api_url,
          params.topic.id,
          topicStatus.Archived
        );
        if (!result) {
          await click.editReply({
            embeds: [embedError("Failed to Archive the topic")],
          });
          return;
        }
        click.client.Topics.set(params.topic.id, {
          name: params.topic.name,
          page_count: params.topic.page_count,
          status: topicStatus.Archived,
          archive_link: params.topic.archive_link, // Replace it with the link
        });
        click.editReply("Successfully Archive the Topic.");
      }
      break;
    case "delete":
      {
        const result = await deleteTopic(click.client.api_url, params.topic.id);
        if (!result) {
          await click.editReply({
            embeds: [embedError("Failed to Delete the topic")],
          });
          return;
        }
        click.client.Topics.delete(params.topic.id);
        click.editReply("Successfully Deleted the Topic.");
        params.interaction.message.delete();
      }
      break;
  }
}