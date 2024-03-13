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
} from "discord.js";
import { Pool } from "pg";
import { topicStatus } from "./shared.types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "node:path";
import fs, { mkdirSync } from "node:fs";
import dotenv from "dotenv";
import { playMusic, stopMusic } from "./components/musicPlayer";
import { archivefolder, notesfolder } from "./components/ManageFiles";
dotenv.config();

export class Frieren extends Client {
  dbPool: Pool = new Pool();
  music: {
    loop: boolean;
    queue: Music[];
    player: AudioPlayer;
  };
  Topics: Collection<
    number,
    {
      name: string;
      page_count: number;
      status: topicStatus;
      archive_link: string | null;
    }
  > = new Collection();

  genAI: GoogleGenerativeAI;
  commands: Collection<any, any> = new Collection();
  buttons: Collection<any, any> = new Collection();

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
    this.initializeMusicComponent()

    // Initilize Gemini AI Client
    if (process.env.GOOGLEAPIKEY === undefined) {
      console.error("No API Key Found");
      process.exit();
    }
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLEAPIKEY);

    // Loads all the Event Files
    console.log("[Bot] Loading Events...");
    this.updateEventHandlers();
    console.log("[Bot] Successfully Loaded the Events!");

    // Loads all the Command and Button Interaction Files
    console.log("[Bot] Adding Interactions to Collection");
    this.updateInteractionCollection();
    console.log("[Bot] Successfully Added Interaction to Collection.");
  }

  updateInteractionCollection() {
    this.commands = new Collection();
    this.buttons = new Collection();

    // Adds Commands to Collection
    const commandFolderPath = path.join(__dirname, "commands/Slash");
    const commandFolders = fs.readdirSync(commandFolderPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(commandFolderPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file: string) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          this.commands.set(command.data.name, command);
        } else {
          console.warn(`${filePath} is missing a required some properties.`);
        }
      }
    }

    // Adds Buttons to Collection
    const buttonsPath = path.join(__dirname, "commands/Buttons");
    const buttonsFiles = fs
      .readdirSync(buttonsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of buttonsFiles) {
      const filePath = path.join(buttonsPath, file);
      const button = require(filePath);
      if ("execute" in button) {
        this.buttons.set(file.split(".js")[0], button);
      }
    }
  }

  updateEventHandlers() {
    // Add Event Handlers to Event Listeners
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

  initializeMusicComponent() {
    // Initilize Components Related to Voice
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
                  `Now Queue has ${this.music.queue.length - 1} song('s) left.`
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

  async initializeDatabase() {
    await this.dbPool
      .query(
        `DO $$ BEGIN
    CREATE TYPE "_status" AS ENUM('Open', 'Closed', 'Archived');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`
      )
      .then(() => console.log("[Database] Successfully created status Enum."))
      .catch((err: Error) => {
        console.error("[Database] Failed to create status Enum.");
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
      .then(() => console.log("[Database] Successfully created Table topic."))
      .catch((err: Error) => {
        console.error("[Database] Failed to create Table topic.");
        throw err;
      });

    await this.dbPool
      .query(
        `CREATE TABLE IF NOT EXISTS "playlist" ( "_userId" varchar(20) PRIMARY KEY NOT NULL, "_songIds" varchar[20])`
      )
      .then(() => console.log("[Database] Successfully create Table playlist."))
      .catch((err: Error) => {
        console.error("[Database] Failed to create Table playlist.");
        console.log(err);
      });
  }
}

interface MusicPlayer {
  onLoop: boolean;
  musicQueue: Music[];
  voicePlayer: AudioPlayer;
}

interface Music {
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
