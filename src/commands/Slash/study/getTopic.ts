import {
  ActionRowBuilder,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  Interaction,
  MessageEditOptions,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { embedError, embedTopic } from "../../../components/EmbedTemplate";
import { getPageLink } from "../../../components/Requests";

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
      .then(
        async (i) =>
          await i.update(await Response(i, +i.values[0]))
      )
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

// Note for HellCat
// Discord Frontend UI doesn't update properly when you change the actions rows and embed 
// In this case, Selection menu was at 1st position in action row when was at 1st position in message component list
// So when A interaction is created by selection menu and doesn't get any response, the new component at same location as selection
// Will have loading animation and interaction Failed Message
async function Response(
  interaction: Interaction,
  id: number
): Promise<MessageEditOptions> {
  const topic = interaction.client.Topics.get(id);
  if (!topic) {
    return {
      embeds: [embedError("No Topic Exists with this id")],
    };
  }
  if (topic.page_count == 0) {
    const message = embedTopic({ id, topicName: topic.name });
    return {
      embeds: [message.embed],
      components: message.rows.slice(1),
    };
  }

  const path = await getPageLink(interaction.client.dbPool, id, 1);

  if (path instanceof Error) {
    return {
      embeds: [embedError(path.message)],
    };
  }

  const message = embedTopic({
    id,
    topicName: topic.name,
    footer: `1 of ${topic.page_count}`,
    pageurl: `attachment://${path.split("/").at(-1)}`,
  });
  return {
    embeds: [message.embed],
    components: message.rows,
    files: [new AttachmentBuilder(path)],
  };
}
