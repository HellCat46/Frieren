import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
} from "@discordjs/voice";
import {
  ActivityType,
  Client,
  Collection,
  EmbedBuilder,
  IntentsBitField,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "node:path";
import fs, { mkdirSync } from "node:fs";
import {
  getWordDetails,
  getWordGuildList,
  removeWordGuild,
} from "./components/Words";
import { playMusic, stopMusic } from "./components/musicPlayer";
import { archivefolder, notesfolder } from "./components/ManageFiles";
import { embedError } from "./components/EmbedTemplate";

export class Frieren extends Client {
  dbPool: Pool = new Pool();
  music: MusicPlayer;
  Topics: Collection<number, TopicData> = new Collection();
  genAI: GoogleGenerativeAI;
  commands: Collection<
    string,
    { data: SlashCommandBuilder; execute: Function }
  > = new Collection();
  buttons: Collection<string, { execute: Function }> = new Collection();

  constructor() {
    // Initilize the Base Discord Bot Client
    super({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
      ],
    });

    // Creates folder for Notes Feature
    mkdirSync(notesfolder, { recursive: true });
    mkdirSync(archivefolder, { recursive: true });

    // Initilize Music Components
    this.music = {
      loop: false,
      player: createAudioPlayer(),
      queue: [],
    };
    this.initializeMusicComponent();

    // Initilize Gemini AI Client
    if (process.env.GOOGLEAPIKEY === undefined) {
      console.error("No API Key Found");
      process.exit();
    }
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLEAPIKEY);

    this.music.player.on("error", (err) => {
      console.log(err);
      if(this.music.queue.length == 0) return;

      this.channels.fetch(this.music.queue[0].channel).then(chan => { 
        if(chan == null) return;
        if(!chan.isTextBased()) return;

        chan.send("Unexpected error occured occured in Music Player.").catch(err => {});
      }
      ).catch(()=> null);
    });

    // Loads all the Event Files
    console.log("\x1b[33m" + "[Bot] Loading Events...");
    this.updateEventHandlers();
    console.log("\x1b[32m" + "[Bot] Successfully Loaded the Events!");

    // Loads all the Command and Button Interaction Files
    console.log("\x1b[33m" + "[Bot] Adding Interactions to Collection");
    this.updateInteractionCollection();
    console.log(
      "\x1b[32m" + "[Bot] Successfully Added Interaction to Collection."
    );
  }

  // Register Commands to
  async RegisterCommands() {
    if (this.user == null)
      throw new Error(
        "Application needs to be a Discord Bot Client to Deploy Commands."
      );

    const guildId = process.env.GUILDID;
    if (guildId == null)
      throw new Error("Guild ID ENV Variable to not defined.");

    const commandsData: SlashCommandBuilder[] = [];
    for (const command of this.commands.values()) {
      commandsData.push(command.data);
    }

    console.log(
      "\x1b[30m" +
        `[Bot] Started refreshing ${commandsData.length} application (/) commands.`
    );

    const data = await this.rest.put(
      Routes.applicationGuildCommands(this.user.id, guildId),
      {
        body: commandsData,
      }
    );

    console.log(
      "\x1b[30m" +
        // @ts-ignore
        `[Bot] Successfully reloaded ${data.length} application (/) commands.`
    );
  }

  // Sends a random word and its details to all the subscriber guilds
  // every day at 6:00 AM (GMT +5:30)
  async SendWordsToServers() {
    try {
      const wordSubGuilds = await getWordGuildList(this.dbPool);

      for (const guildData of wordSubGuilds) {
        const guild = await this.guilds.fetch(guildData.guildId);
        if (guild == null) {
          await removeWordGuild(this.dbPool, guildData.guildId);
          continue;
        }

        let chann;
        try {
          chann = await guild.channels.fetch(guildData.channelId);
          if (
            !chann ||
            !chann.isTextBased() ||
            !(
              guild.members.me &&
              chann.permissionsFor(guild.members.me).has("SendMessages")
            )
          )
            throw new Error("No Write Access");
        } catch (ex) {
          await (
            await guild.fetchOwner()
          ).send({
            embeds: [
              embedError(
                `Unable to send message in <#${guildData.channelId}>. Make sure the bot has permission to send message in it.`
              ),
            ],
          });
          continue;
        }
        const channel = chann;

        for (let tryNo = 0; tryNo < 2; tryNo++) {
          try {
            const wordRes = await getWordDetails();
            if (wordRes instanceof Error) continue;

            await channel.send({ embeds: wordRes });
            break;
          } catch (ex) {
            console.error(ex);
          }
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  }
  // Fetches Interaction Data from the directories using node fs modules
  // and add them to collection.
  // In case of failure, it will just throw exception and if exception is handled
  // Existing collection map will be used.
  updateInteractionCollection() {
    // Adds Commands to Collection
    const commands: typeof this.commands = new Collection();
    const commandFolderPath = path.join(__dirname, "commands/Slash");
    const commandFolders = fs.readdirSync(commandFolderPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(commandFolderPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file: string) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);

        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
          commands.set(command.data.name, command);
        } else {
          console.warn(`${filePath} is missing a required some properties.`);
        }
      }
    }
    this.commands = commands;

    // Adds Buttons to Collection
    const buttons: typeof this.buttons = new Collection();
    const buttonsPath = path.join(__dirname, "commands/Buttons");
    const buttonsFiles = fs
      .readdirSync(buttonsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of buttonsFiles) {
      const filePath = path.join(buttonsPath, file);

      delete require.cache[require.resolve(filePath)];
      const button = require(filePath);

      if ("execute" in button) {
        buttons.set(file.split(".js")[0], button);
      }
    }
    this.buttons = buttons;
  }

  // Add Event Handlers to Client Events
  updateEventHandlers() {
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args));
      } else {
        this.on(event.name, (...args) => event.execute(this, ...args));
      }
    }
  }

  // Initilize Components Related to Voice
  initializeMusicComponent() {
    this.music.player.on(AudioPlayerStatus.Idle, async () => {
      try {
        if (this.music.loop != true) {
          // Removes the song that was last playing
          const guildId = this.music.queue.shift()?.guild;
          if (this.music.queue.length == 0) {
            stopMusic(this, guildId);
            return;
          }
        }

        const music = this.music.queue[0];

        // Channel where song was request.
        const guild = await this.guilds.fetch(music.guild);
        const channel = await this.channels.fetch(music.channel);

        playMusic(this.music.player, music);

        // Notifies user about new song playing
        if (
          channel?.isTextBased() &&
          guild.members.me?.permissionsIn(channel.id).has("SendMessages")
        )
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Now Playing: ${music.title}`)
                .setDescription(
                  `Queue has ${this.music.queue.length - 1} song('s) left.`
                )
                .setColor("Green"),
            ],
          });

        this.user?.setActivity({
          name: music.title,
          type: ActivityType.Playing,
        });
      } catch (ex) {
        console.error(ex);
      }
    });
  }

  // Creates tables and other required entity in the Database.
  async initializeDatabase() {
    await this.dbPool
      .query(
        `DO $$ BEGIN
    CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`
      )
      .then(() =>
        console.log("\x1b[35m" + "[Database] Successfully created status Enum.")
      )
      .catch((err: Error) => {
        console.error("\x1b[31m" + "[Database] Failed to create status Enum.");
        throw err;
      });

    await this.dbPool
      .query(
        `CREATE TABLE IF NOT EXISTS "topic" (
	"_id" serial PRIMARY KEY NOT NULL,
	"_name" varchar(50) NOT NULL,
	"_status" "_status" NOT NULL,
	"_pagePaths" varchar(41)[] NOT NULL,
	"_archivePath" varchar(50),
	CONSTRAINT "topic__name_unique" UNIQUE("_name")
  );`
      )
      .then(() =>
        console.log("\x1b[35m" + "[Database] Successfully synced Table topic.")
      )
      .catch((err: Error) => {
        console.error("\x1b[31m" + "[Database] Failed to sync Table topic.");
        throw err;
      });

    await this.dbPool
      .query(
        `CREATE TABLE IF NOT EXISTS "playlist" ( "_userId" varchar(20) PRIMARY KEY NOT NULL, "_songIds" varchar[20])`
      )
      .then(() =>
        console.log(
          "\x1b[35m" + "[Database] Successfully synced Table playlist."
        )
      )
      .catch((err: Error) => {
        console.error("\x1b[31m" + "[Database] Failed to sync Table playlist.");
        throw err;
      });

    await this.dbPool
      .query(
        `CREATE TABLE IF NOT EXISTS "wordguilds" ("guildId" varchar(25) PRIMARY KEY NOT NULL, "channelId" varchar(25) NOT NULL)`
      )
      .then(() =>
        console.log(
          "\x1b[35m" + "[Database] Successfully synced Table WordGuilds"
        )
      )
      .catch((err: Error) => {
        console.error(
          "\x1b[31m" + "[Database] Failed to sync Table WordGuilds."
        );
        throw err;
      });
  }
}

interface MusicPlayer {
  loop: boolean;
  queue: Music[];
  player: AudioPlayer;
}

export interface Music {
  title: string;
  url: string;
  thumbnail: string | undefined;
  length: number;
  author: {
    name: string;
    url: string;
  };
  channel: string;
  guild: string;
}

export interface TopicData {
  name: string;
  page_count: number;
  status: topicStatus;
  archive_link: string | null;
}

export enum topicStatus {
  Open,
  Closed,
  Archived,
}
