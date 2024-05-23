import dotenv from "dotenv";
import { Frieren } from "./Frieren";
import { CronJob } from "cron";
dotenv.config();

(async () => {
  const client = new Frieren();
  await client.initializeDatabase();
  await client.login(process.env.DISCORD_TOKEN);
  await client.RegisterCommands();

  const job = new CronJob(
    "0 6 * * *",
    () => {
      client.SendWordsToServers();
    },
    null,
    true,
    "Asia/Kolkata"
  );
})();
