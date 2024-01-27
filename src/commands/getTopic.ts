import {
  ActionRowBuilder,
  AttachmentBuilder,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { embedError, embedTopic } from "../components/EmbedTemplate";
import { getPageLink } from "../components/Requests";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gettopic")
    .setDescription("Get Embed of existing Topic")
    .addIntegerOption((options) =>
      options.setName("id").setDescription("ID of the Topic")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    let id = interaction.options.getInteger("id");

    if (id != null) {
      await Response(interaction, id);
      return;
    }

    let selection = new StringSelectMenuBuilder()
      .setCustomId("topicSelection")
      .setPlaceholder("Select one of these topics");

    for (const topic of interaction.client.Topics) {
      selection.options.push(
        new StringSelectMenuOptionBuilder()
          .setValue(`${topic[0]}`)
          .setLabel(`${topic[1].name}`)
          .setDescription(`This topic has ${topic[1].page_count} pages.`)
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("Topic Selector")
      .setDescription(
        "Don't remember the ID of the topic? Worry not. Select a topic from the selection menu below."
      )
      .setFooter({ text: "The Menu will disappear after 2 minutes" });

    await (
      await interaction.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selection
          ),
        ],
      })
    )
      .awaitMessageComponent({
        filter: (selection) => selection.user.id == interaction.user.id,
        time: 120000,
        componentType: ComponentType.StringSelect,
      })
      .then(async (value) => await Response(interaction, +value.values[0]))
      .catch(
        async () =>
          await interaction.editReply({
            content: "Timer Ended",
            embeds: [],
            components: [],
          })
      );
  },
};

async function Response(interaction: ChatInputCommandInteraction, id: number) {
  const topic = interaction.client.Topics.get(id);
  if (!topic) {
    await interaction.editReply({
      embeds: [embedError("No Topic Exists with this id")],
    });
    return;
  }
  if (topic.page_count == 0) {
    const message = embedTopic({ id, topicName: topic.name });
    await interaction.editReply({
      embeds: [message.embed],
      components: message.rows.slice(1),
    });
    return;
  }

  const path = await getPageLink(
    interaction.client.dbPool,
    id,
    1
  );

  if (path instanceof Error) {
    await interaction.editReply({
      embeds: [embedError(path.message)],
    });
    return;
  }

  const file = new AttachmentBuilder(path);
  const message = embedTopic({
    id,
    topicName: topic.name,
    footer: `1 of ${topic.page_count}`,
    pageurl: `attachment://${path.split("/").at(-1)}`,
  });
  await interaction.editReply({
    embeds: [message.embed],
    components: message.rows,
  });
}
