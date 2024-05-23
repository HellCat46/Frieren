import { EmbedBuilder } from "discord.js";
import { Pool } from "pg";

export async function getWordDetails(argWord?: string | null) {
  const word: string | null = argWord
    ? argWord
    : (
        await (
          await fetch(
            "https://random-word-api.vercel.app/api?words=1&type=capitalized"
          )
        ).json()
      )[0];

  if (!word) return new Error("Unable to get a word. Please try again");

  const wordInfoRes = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
  );
  if (!wordInfoRes.ok) return new Error("Unable to get meaning of the word.");

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
                `\n**__Type:__ ${meaning.partOfSpeech}** \n${meaning.definitions
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
  return embeds;
}

export async function getWordGuildList(dbPool: Pool) {
  const entries: { guildId: string; channelId: string }[] = (
    await dbPool.query('SELECT * FROM "wordguilds";')
  ).rows;

  return entries;
}

export async function removeWordGuild(dbPool: Pool, guildId: string) {
  await dbPool.query(`DELETE FROM "wordguilds" WHERE "guildId" = '${guildId}'`);
}

export async function setWordGuild(
  dbPool: Pool,
  guildId: string,
  channelId: string
) {
  const fetchGuild = await dbPool.query(
    `SELECT * FROM "wordguilds" WHERE "guildId" = '${guildId}'`
  );
  if (fetchGuild.rowCount === 0) {
    const res = await dbPool.query(
      `INSERT INTO wordguilds VALUES(${guildId}, ${channelId});`
    );
    if (res.rowCount === 0)
      return new Error("Unable to Insert Data into the DB.");
    return;
  }

  if (fetchGuild.rows[0].channelId === channelId) return;

  const res = await dbPool.query(
    `UPDATE wordguilds SET "channelId" = '${channelId}' WHERE "guildId" = '${guildId}'`
  );
  if (res.rowCount === 0) return new Error("Unable to Update Data in the DB.");
}

export interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; synonyms: string[] }[];
  }[];
  license: { name: string; url: string };
  sourceUrls: string[];
}
