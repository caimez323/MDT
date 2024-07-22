console.log("loading bot");


const fs = require("fs")
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
//require('dotenv').config();
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
//Setting my app
const app = express();
const server = http.createServer(app);
const io = new Server(server);
require("dotenv").config();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let messagesByRoom = {};
let userPermissions = {};

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
    //console.log("message from client: " + msg);

    // Exemple d'envoi d'un message à un canal Discord
    // On catch le socket emit dans le debug
    const channel = client.channels.cache.get("1245008440145739880");
    if (channel) {
      // Sur le papier, les messages sont envoyés dans les salons vocaux
      // Les canaux sont nommés d'après les cannals vocaux
      // Ensuite les messages sont stockés sur le serveur socket js et la copie également
      // En revanche, la copie des message qui est envoyé en texte va venir chercher un salon textuel correspondant,
      channel.send(`Message in ${msg.room} : ${msg.message}`);
    }

    // Réponse au client Socket.IO
    // socket.emit("message");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected from direct socket");
  });
});

// Définition des routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ça marche donc on touche pas, je sais que ça vient d'un problème de chemin le fait de ne pas pouvoir faire une une ligne comme prévu mais
// C'est moi qui décide et pour l'instant ça marche donc
const resourcesPath = path.join(__dirname, 'resources');

// Fonction pour parcourir les fichiers et dossiers récursivement
function registerRoutes(directory, baseRoute = '/resources') {
  fs.readdir(directory, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Erreur lors de la lecture du répertoire', err);
      return;
    }

    files.forEach(file => {
      const fullPath = path.join(directory, file.name);
      const routePath = path.join(baseRoute, file.name).replace(/\\/g, '/');

      if (file.isDirectory()) {
        // Appel récursif pour les sous-dossiers
        registerRoutes(fullPath, routePath);
      } else {
        // Création de la route pour le fichier
        app.get(routePath, (req, res) => {
          res.sendFile(fullPath);
        });
        console.log(`Route créée: ${routePath} -> ${fullPath}`);
      }
    });
  });
}

// Appel de la fonction pour le répertoire de ressources
registerRoutes(resourcesPath);

app.get("/form", (req, res) => {
  res.sendFile(path.join(__dirname, "form.html"));
});

app.get("/1", (req, res) => {
  res.sendFile(path.join(__dirname, "/src/1.html"));
});

app.get("/api/userRight", async (req, res) => {
  const guildId = process.env.SERVER_ID;
  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch();

  const users = members.map((member) => ({
    id: member.user.id,
    username: member.user.username,
  }));

  let rights = {};
  for (const [_, value] of Object.entries(users)) {
    console.log(value);
    rights[value.id] = ["lobby"];
  }

  console.log(rights);
  res.json(rights);
});

app.get("/api/user-permissions", (req, res) => {
  const { userId } = req.query;
  const permissions = userPermissions[userId] || {
    rooms: ["1"],
    isAdmin: false,
  };
  res.json(permissions);
});

// Route pour fournir les données des canaux vocaux
app.get("/api/voice-channels", async (req, res) => {
  try {
    const guildId = process.env.SERVER_ID;
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();

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
    const guildId = process.env.SERVER_ID;
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
  const guild = client.guilds.cache.first();
  const member = guild.members.cache.get(userId);
  if (member) {
    try {
      await member.voice.setChannel(channelId);
      res.status(200).send("User moved");
    } catch (error) {
      console.error("Error moving user:", error);
      res.status(500).send("Error moving user");
    }
  } else {
    res.status(404).send("User not found");
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

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("joinRoom", (room, userId) => {
    const user = userPermissions[userId] || { rooms: ["1"], isAdmin: false };
    console.log(user)
    if (user.rooms.includes(room) || user.isAdmin) {
      socket.join(room);
      socket.emit("loadMessages", messagesByRoom[room] || []);
    } else {
      socket.emit("error", "You do not have access to this room.");
    }
  });

  socket.on("message", async ({ room, message, userId }) => {
    if (!messagesByRoom[room]) {
      messagesByRoom[room] = [];
    }
    messagesByRoom[room].push(message);
    io.to(room).emit("message", message);

    // Send a copy of the message to the corresponding Discord text channel
    const guildId = process.env.SERVER_ID;
    const guild = await client.guilds.fetch(guildId);
    const textChannel = guild.channels.cache.find(
      (ch) => ch.name === room && ch.type === 0,
    );
    if (textChannel) {
      textChannel.send(message);
    }

    // Unlock rooms if the message contains the keyword "Pizza"
    if (room === "1" && message.toLowerCase() === "pizza") {
      userPermissions[userId] = {
        ...userPermissions[userId],
        rooms: ["1", "2", "3"],
      };
      socket.emit("permissionsUpdated", userPermissions[userId]);
    }
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
