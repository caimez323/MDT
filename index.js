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


app.get("/datas", async (req, res) => {
  const guildId = process.env.SERVER_ID;
  const guild = await client.guilds.fetch(guildId);

  const channels = await guild.channels.fetch();

  const voiceChannels = channels
    .filter((channel) => channel.type === 2 && channel.members.size)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      size: channel.members.size,
    }));

  res.json(voiceChannels);
});

// Démarrage du serveur HTTP
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
