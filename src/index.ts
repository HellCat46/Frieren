import dotenv from "dotenv";
import { Frieren } from "./Frieren";
dotenv.config();


const client = new Frieren();

client.initializeDatabase();
client.login(process.env.DISCORD_TOKEN);