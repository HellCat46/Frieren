import dotenv from "dotenv";
import { Frieren } from "./Frieren";
dotenv.config();

(async () => {
  const client = new Frieren();
  await client.initializeDatabase();
  await client.login(process.env.DISCORD_TOKEN);
  await client.RegisterCommands();
})();
