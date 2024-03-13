import { Events, Client } from "discord.js";
import { getTopics } from "../components/Requests";
import { Frieren } from "../Frieren";

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Frieren) {
    client.Topics = await getTopics(client.dbPool);
    console.log("Logged in as " + client.user?.tag);
  },
};
