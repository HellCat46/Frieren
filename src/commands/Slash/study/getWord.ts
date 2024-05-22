import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Frieren } from "../../../Frieren";
import { embedError } from "../../../components/EmbedTemplate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getword")
    .setDescription("Get a random word with its meaning")
    .addStringOption((options) =>
      options.setName("word").setDescription("Word that you want meaning of")
    ),
  async execute(client: Frieren, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const argWord = interaction.options.getString("word");

    const word: string | null = argWord
      ? argWord
      : (
          await (
            await fetch(
              "https://random-word-api.vercel.app/api?words=1&type=capitalized"
            )
          ).json()
        )[0];

    if (!word) {
      await interaction.editReply({
        embeds: [embedError("Unable to get a word. Please try again")],
      });
      return;
    }

    const wordInfoRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    if (!wordInfoRes.ok) {
      await interaction.editReply({
        embeds: [embedError("Unable to get meaning of the word.")],
      });
      return;
    }

    const wordInfos: DictionaryApiResponse[] = await wordInfoRes.json();

    const embeds: EmbedBuilder[] = [];
    for (const wordInfo of wordInfos) {
      embeds.push(
        new EmbedBuilder()
          .setTitle(wordInfo.word)
          .setDescription(
            `${
              wordInfo.phonetic
                ? `**__Phonetic:__ ${wordInfo.phonetic}**\n\n`
                : ""
            }${wordInfo.meanings
              .map(
                (meaning) =>
                  `\n**__Type:__ ${
                    meaning.partOfSpeech
                  }** \n${meaning.definitions
                    .slice(0, 5)
                    .map(
                      (def) =>
                        `**Definition:** *${def.definition}* ${
                          def.synonyms.length > 0
                            ? `\n**Synonyms:** __${def.synonyms.join(", ")}__\n`
                            : "\n"
                        }`
                    )
                    .join("\n")}`
              )
              .join(
                "\n"
              )}${`\n\n\n\n**In Other Languages:** [Google Translate](https://translate.google.co.in/?sl=en&tl=hi&text=${word}&op=translate)`}${`\n**Sources:** ${wordInfo.sourceUrls.map(
              (source, idx) => `[${idx + 1}](${source})`
            )}`}`
          )
          .setFooter({ text: `${wordInfo.license.name}` })
          .setTimestamp()
          .setColor("Random")
      );
    }

    await interaction.editReply({ embeds: embeds });
  },
};

interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; synonyms: string[] }[];
  }[];
  license: { name: string; url: string };
  sourceUrls: string[];
}
