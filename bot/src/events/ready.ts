import { Events, Client} from "discord.js";
import { getTopics } from "../components/Requests";

module.exports = {
    name : Events.ClientReady,
    once : true,
    async execute(client : Client){
        client.Topics = await getTopics()
        console.log("Logged in as " + client.user?.tag);
    }
}