import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Events,
  IntentsBitField,
  Collection,
  CommandInteraction,
  Interaction,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });

client.commands = new Collection();
client.Topics = new Array();

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
    console.log(`${filePath} is missing a required some properties.`);
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for(const file of eventFiles){
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if(event.once){
		client.once(event.name, (...args) => event.execute(...args))
	}else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(process.env.DISCORD_TOKEN);
