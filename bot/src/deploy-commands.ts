import { REST, Routes } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

let clientId = process.env.CLIENTID;
let guildId = process.env.GUILDID;
let token = process.env.DISCORD_TOKEN;

if(token == null || guildId == null || clientId == null){
    console.error("One or more environment variable has null value.");
    process.exit();
}

const commands = [];

  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file: string) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
}


const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data  = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(
        // @ts-ignore
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
