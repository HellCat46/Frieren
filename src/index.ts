import fs from "node:fs";
import path from "node:path";
import { Client, IntentsBitField, Collection, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import { Pool } from "pg";
import { InitializeDatabase } from "./components/Requests";
import { initializeFileModule } from "./components/ManageFiles";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  getVoiceConnections,
} from "@discordjs/voice";
import { playMusic } from "./components/musicPlayer";
dotenv.config();

initializeFileModule();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

client.dbPool = new Pool();
client.Topics = new Collection();

client.commands = new Collection();
client.buttons = new Collection();

if (process.env.GOOGLEAPIKEY === undefined) {
  console.error("No API Key Found");
  process.exit();
}
client.genAI = new GoogleGenerativeAI(process.env.GOOGLEAPIKEY);

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`${filePath} is missing a required some properties.`);
  }
}

const buttonsPath = path.join(__dirname, "events/Buttons");
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
client.musicQueue = [];
client.voicePlayer = createAudioPlayer();
client.voicePlayer.on(AudioPlayerStatus.Idle, async () => {
  try {
    // Removes the song that was last playing
    const guildId =  client.musicQueue.shift()?.guild;

    if (client.musicQueue.length == 0){
      client.voicePlayer.stop();

      // Destroys resources allocated the connection and disconnects the bot from Voice Channel
      if(guildId == null) return
      const conn = getVoiceConnection(guildId);
      if(conn) conn.destroy(); 
      return;
    }

    const music = client.musicQueue[0];

    // Channel where song was request. 
    const guild = await client.guilds.fetch(music.guild);
    const channel = await client.channels.fetch(music.channel);

    playMusic(client.voicePlayer, music);

    // Notifies user about new song playing
    if (channel?.isTextBased() && guild.members.me?.permissionsIn(channel.id).has("SendMessages") )
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Now Playing: ${music.title}`)
            .setDescription(`Now Queue has ${client.musicQueue.length-1} song('s) left.`)
            .setColor("Green"),
        ],
      });
  } catch (ex) {

    console.error(ex);
  }
});


client.user?.setPresence({
  
})
InitializeDatabase(client.dbPool);
client.login(process.env.DISCORD_TOKEN);
