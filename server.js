require("dotenv").config(); // Load environment variables
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Update with frontend URL
    methods: ["GET", "POST"]
  }
});

// Load environment variables
const PORT = process.env.PORT || 5010;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "view"))); // Serve static HTML pages

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// **User Schema**
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", UserSchema);

// **Message Schema (Group & Private Messages)**
const MessageSchema = new mongoose.Schema({
  from_user: String,
  to_user: String, // If null, it's a group message
  room: String, // If null, it's a private message
  message: String,
  date_sent: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// **Predefined Chat Rooms**
const rooms = ["devops", "cloud computing", "covid19", "sports", "nodeJS"];

// **Serve Signup & Login Pages**
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "login.html"));
});

// **Signup Route**
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ message: "User already exists" });
  }
});

// **Login Route**
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// **Get Available Chat Rooms**
app.get("/api/rooms", (req, res) => {
  res.json({ rooms });
});

// **Socket.io for Real-Time Chat**
io.on("connection", (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);

  // **User Joins Room**
  socket.on("joinRoom", ({ room, username }) => {
    if (!rooms.includes(room)) {
      socket.emit("error", { message: "Invalid room" });
      return;
    }
    socket.join(room);
    console.log(`User ${username} joined room: ${room}`);
    io.to(room).emit("message", { username: "Chat Bot", message: `${username} has joined the room.` });
  });

  // **User Sends a Group Message**
  socket.on("chatMessage", async ({ room, message, username }) => {
    console.log(`Message from ${username}: ${message} (Room: ${room})`);
    const chatMessage = new Message({ from_user: username, room, message });
    await chatMessage.save();
    io.to(room).emit("message", { username, message });
  });

  // **Private Messaging (Direct Messages)**
  socket.on("privateMessage", async ({ toUser, message, fromUser }) => {
    console.log(`Private message from ${fromUser} to ${toUser}: ${message}`);
    const privateMessage = new Message({ from_user: fromUser, to_user: toUser, message });
    await privateMessage.save();

    // Send message to specific user
    socket.to(toUser).emit("privateMessage", { fromUser, message });
  });

  // **Typing Indicator**
  socket.on("userTyping", ({ room, username }) => {
    socket.to(room).emit("userTyping", username);
  });

  socket.on("stopTyping", (room) => {
    socket.to(room).emit("stopTyping");
  });

  // **User Leaves Room**
  socket.on("leaveRoom", ({ room, username }) => {
    socket.leave(room);
    io.to(room).emit("message", { username: "Chat Bot", message: `${username} has left the room.` });
    console.log(`${username} left room: ${room}`);
  });

  // **User Disconnects**
  socket.on("disconnect", () => {
    console.log(`❌ User ${socket.id} disconnected`);
  });
});

// **Start Server**
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
