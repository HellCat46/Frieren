import fs from "node:fs";
import path from "node:path";
import { Client, IntentsBitField, Collection, EmbedBuilder, ActivityType } from "discord.js";
import dotenv from "dotenv";
import { Pool } from "pg";
// import { InitializeDatabase, } from "./components/Initialize";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  getVoiceConnection,
} from "@discordjs/voice";
import { playMusic, stopMusic } from "./components/musicPlayer";
import { Frieren } from "./Frieren";
dotenv.config();


const client = new Frieren();

client.initializeDatabase();
client.login(process.env.DISCORD_TOKEN);