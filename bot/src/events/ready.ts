import { Events, Client } from "discord.js";

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log("Logged in as " + client.user?.tag);
  },
};
