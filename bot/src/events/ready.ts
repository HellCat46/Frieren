import { Events, Client} from "discord.js";
import { getTopics } from "../components/Requests";

module.exports = {
    name : Events.ClientReady,
    once : true,
    async execute(client : Client){
        client.Topics = await getTopics(client.api_url, client.file_router)
        console.log("Logged in as " + client.user?.tag);
    }
}