console.log("loading bot");

const { Client, GatewayIntentBits } = require("discord.js");
//require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
//Setting my app
const app = express();
const server = http.createServer(app);
const io = new Server(server);
require("dotenv").config();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.login(process.env.BOT_TOKEN);
console.log("Hello World");

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.channel.send("Pong!");
  }
});

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log("a user connected to direct socket");

  // Écoute des messages venant du client Socket.IO
  socket.on("message", (msg) => {
    console.log("message from client: " + msg);

    // Exemple d'envoi d'un message à un canal Discord
    // On catch le socket emit
    const channel = client.channels.cache.get("1245008440145739880");
    if (channel) {
      channel.send(`Message from client: ${msg}`);
    }

    // Réponse au client Socket.IO
    socket.emit("message", "Back from server");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected from direct socket");
  });
});

// Définition des routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/form", (req, res) => {
  res.sendFile(path.join(__dirname, "form.html"));
});

app.get("/discoTab", (req, res) => {
  res.sendFile(path.join(__dirname, "discoTab.html"));
});

app.get("/api/serverDatas", async (req, res) => {
  res.json(process.env.SERVER_ID);
});

app.get("/api/userTrack", async (req, res) => {
  const userTrackDict = {
    1: "a",
    2: "b",
    3: "c",
    4: "d",
  };
  res.json(userTrackDict);
});

app.get("/api/discoTab", async (req, res) => {
  const tabDisco = {
    1: "a",
    2: "b",
    3: "c",
    4: "d",
  };
  res.json(tabDisco);
});

// Route pour fournir les données des canaux vocaux
app.get("/api/voice-channels", async (req, res) => {
  try {
    const guildId = process.env.SERVER_ID;
    const guild = await client.guilds.fetch(guildId);

    const voiceChannels = guild.channels.cache
      .filter((channel) => channel.type === 2)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        memberCount: channel.members.size,
      }));

    res.json(voiceChannels);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Route pour servir la page HTML
app.get("/data", (req, res) => {
  res.sendFile(path.join(__dirname, "data.html"));
});

app.get("/api/users", async (req, res) => {
  try {
    const guildId = process.env.SERVER_ID; // Remplacez par votre ID de serveur
    const guild = await client.guilds.fetch(guildId);

    const members = await guild.members.fetch();

    const users = members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
    }));

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/move-user", async (req, res) => {
  const { userId, channelId } = req.body;

  try {
    const guildId = process.env.SERVER_ID; // Remplacez par votre ID de serveur
    const guild = await client.guilds.fetch(guildId);

    const member = await guild.members.fetch(userId);
    await member.voice.setChannel(channelId);

    res.send("Utilisateur déplacé avec succès");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors du déplacement de l'utilisateur");
  }
});

app.get("/move", (req, res) => {
  res.sendFile(path.join(__dirname, "move.html"));
});

// Démarrage du serveur HTTP
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
