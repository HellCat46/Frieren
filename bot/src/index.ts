import fs from "node:fs";
import path from "node:path";
import { Client, IntentsBitField, Collection } from "discord.js";
import dotenv from "dotenv";
import { getTopics } from "./components/Requests";
dotenv.config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
client.api_url = process.env.API_URL!;
client.file_router = process.env.FILE_ROUTER!;
client.Topics = getTopics(client.api_url, client.file_router);

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

client.login(process.env.DISCORD_TOKEN);
