import fs from "node:fs";
import path from "node:path";
import { Client, IntentsBitField, Collection, EmbedBuilder, ActivityType } from "discord.js";
import dotenv from "dotenv";
import { Pool } from "pg";
import { InitializeDatabase,InitializeFileModule } from "./components/Initialize";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  getVoiceConnection,
} from "@discordjs/voice";
import { playMusic, stopMusic } from "./components/musicPlayer";
dotenv.config();

// Creates Folders required for notes
InitializeFileModule();

// Initilize Discord Bot Client
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

// Initilize Database Pool and Topic Collection for Notes
client.dbPool = new Pool();
client.Topics = new Collection();

// Initilize Commands and Button Interaction Collection
client.commands = new Collection();
client.buttons = new Collection();

// Initilize Gemini Client for AI stuff
if (process.env.GOOGLEAPIKEY === undefined) {
  console.error("No API Key Found");
  process.exit();
}
client.genAI = new GoogleGenerativeAI(process.env.GOOGLEAPIKEY);

// Adds Commands to Collection
const commandFolderPath = path.join(__dirname, "commands/Slash");
const commandFolders = fs.readdirSync(commandFolderPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(commandFolderPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file: string) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`${filePath} is missing a required some properties.`);
    }
  }
}

// Adds Buttons to Collection
const buttonsPath = path.join(__dirname, "commands/Buttons");
const buttonsFiles = fs
  .readdirSync(buttonsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of buttonsFiles) {
  const filePath = path.join(buttonsPath, file);
  const button = require(filePath);
  if ("execute" in button) {
    client.buttons.set(file.split(".js")[0], button);
  }
}

// Add Event Handlers to Event Listeners
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Initilize Components Related to Voice
client.music = {
  loop: false,
  player: createAudioPlayer(),
  queue : []
};
client.music.player.on(AudioPlayerStatus.Idle, async () => {
  try {
    if(client.music.loop != true){
      // Removes the song that was last playing
      const guildId = client.music.queue.shift()?.guild;
      if (client.music.queue.length == 0) {
        stopMusic(client, guildId);
        return;
      }
    }

    const music = client.music.queue[0];

    // Channel where song was request.
    const guild = await client.guilds.fetch(music.guild);
    const channel = await client.channels.fetch(music.channel);

    playMusic(client.music.player, music);

    // Notifies user about new song playing
    if (
      channel?.isTextBased() &&
      guild.members.me?.permissionsIn(channel.id).has("SendMessages")
    )
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Now Playing: ${music.title}`)
            .setDescription(
              `Now Queue has ${client.music.queue.length - 1} song('s) left.`
            )
            .setColor("Green"),
        ],
      });

    client.user?.setActivity({
      name: music.title,
      type: ActivityType.Playing,
    });
  } catch (ex) {
    console.error(ex);
  }
});


InitializeDatabase(client.dbPool);
client.login(process.env.DISCORD_TOKEN);
