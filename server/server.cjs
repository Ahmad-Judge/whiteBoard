const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  socketId: String,
  ratings: [Number],
});
const User = mongoose.model("User", userSchema);

const drawingSchema = new mongoose.Schema({
  x0: Number,
  y0: Number,
  x1: Number,
  y1: Number,
  color: String,
});
const Drawing = mongoose.model("Drawing", drawingSchema);

// Game logic
let currentDrawerId = null;
let timer = 30;
let currentRound = 1;
let usersDrawnThisRound = new Set();
let ratingsLog = {};
const MAX_ROUNDS = 3;
let countdownTimer = null;

const broadcastUsers = async () => {
  const users = await User.find();
  const formatted = users.map((u) => ({
    name: u.name,
    socketId: u.socketId,
    rating: u.ratings.length
      ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length
      : 0,
  }));
  io.emit("users", formatted);
};

const broadcastTurn = () => {
  io.emit("turn", { socketId: currentDrawerId, round: currentRound });
};

const nextDrawer = async () => {
  const users = await User.find();
  const eligibleUsers = users.filter(
    (u) => !usersDrawnThisRound.has(u.socketId)
  );

  // If round is over
  if (eligibleUsers.length === 0) {
    if (currentRound >= MAX_ROUNDS) {
      const leaderboard = users
        .map((u) => ({
          name: u.name,
          rating: u.ratings.length
            ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length
            : 0,
        }))
        .sort((a, b) => b.rating - a.rating);

      io.emit("leaderboard", leaderboard);

      setTimeout(async () => {
        currentRound = 1;
        usersDrawnThisRound.clear();
        ratingsLog = {};
        await Drawing.deleteMany();
        io.emit("clear");
        io.emit("round", currentRound);
        nextDrawer();
      }, 10000);

      return;
    }

    // Start new round
    currentRound++;
    usersDrawnThisRound.clear();
    ratingsLog[currentRound] = {};
    io.emit("round", currentRound);
    return nextDrawer();
  }

  // Pick next drawer
  const nextUser = eligibleUsers[0];
  currentDrawerId = nextUser.socketId;
  usersDrawnThisRound.add(currentDrawerId);
  timer = 30;

  await Drawing.deleteMany();
  io.emit("clear");
  broadcastTurn();

  // Clear old timer if exists
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    timer--;
    io.emit("timer", timer);
    if (timer <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      nextDrawer();
    }
  }, 1000);
};

// Socket Events
io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join", async (name) => {
    await User.deleteMany({ socketId: socket.id });
    await User.create({ name, socketId: socket.id, ratings: [] });

    const history = await Drawing.find();
  

    await broadcastUsers();

    const users = await User.find();
    if (!currentDrawerId && users.length > 0) {
      usersDrawnThisRound.clear();
      currentRound = 1;
      ratingsLog[currentRound] = {};
      io.emit("round", currentRound);
      nextDrawer();
    } else {
      socket.emit("turn", { socketId: currentDrawerId, round: currentRound });
    }
    socket.emit("timer", timer);
  });

  socket.on("draw", async (data) => {
    await Drawing.create(data);
    socket.broadcast.emit("draw", data);
  });

  socket.on("clear", async () => {
    await Drawing.deleteMany();
    io.emit("clear");
  });

  socket.on("rate", async ({ targetName, value }) => {
    const fromId = socket.id;
    if (socket.id === currentDrawerId) return;

    if (!ratingsLog[currentRound]) ratingsLog[currentRound] = {};
    if (!ratingsLog[currentRound][fromId])
      ratingsLog[currentRound][fromId] = [];

    if (ratingsLog[currentRound][fromId].includes(targetName)) return;

    const user = await User.findOne({ name: targetName });
    if (user) {
      user.ratings.push(value);
      await user.save();
      ratingsLog[currentRound][fromId].push(targetName);
      await broadcastUsers();
    }
  });

  socket.on("disconnect", async () => {
    await User.deleteOne({ socketId: socket.id });
    await broadcastUsers();

    if (socket.id === currentDrawerId) {
      currentDrawerId = null;
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      nextDrawer();
    }
  });

socket.on("leave", async () => {
  console.log(`👋 User requested to leave: ${socket.id}`);
  await User.deleteOne({ socketId: socket.id });
  await broadcastUsers();

  if (socket.id === currentDrawerId) {
    currentDrawerId = null;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    nextDrawer();
  }
 await User.deleteOne({ socketId: socket.id });
  // Disconnect the socket manually if needed
  socket.disconnect(true);
});
socket.on("leave", async () => {
  console.log(`👋 User requested to leave: ${socket.id}`);
  await User.deleteOne({ socketId: socket.id });
  await broadcastUsers();

  if (socket.id === currentDrawerId) {
    currentDrawerId = null;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    nextDrawer();
  }
   await User.deleteMany({});
  // Disconnect the socket manually if needed
  socket.disconnect(true);
});

});

// Utility route
app.get("/delete-all-users", async (req, res) => {
  await User.deleteMany({});
  res.send("All users deleted.");
});


// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});