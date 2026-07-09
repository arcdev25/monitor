const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let liveUsers = {};
setInterval(() => {
  const now = Date.now();

  Object.keys(liveUsers).forEach((key) => {
    const user = liveUsers[key];
    const diff = now - new Date(user.lastSeen).getTime();

    if (diff > 30000) {
      user.isOnline = false;
      user.isActive = false;
      user.keyboardCount = 0;
      user.mouseCount = 0;
    }
  });

  io.emit("live-users", liveUsers);
}, 5000);

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);

  socket.emit("live-users", liveUsers);

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

app.post("/activity", (req, res) => {
  const data = req.body;
  const keys = data.keyboardCount || 0;
  const clicks = data.mouseClickCount || 0;
  const scrolls = data.mouseScrollCount || 0;
  const moves = data.mouseMoveCount || 0;

  const score =
    keys +
    (clicks * 3) +
    (scrolls * 2);

  let status = "Idle";

  if (keys > 5 || clicks > 0 || scrolls > 0) {
    status = "Working";
  }
  else if (moves > 50) {
    status = "Suspicious";
  }

  liveUsers[data.userId] = {
    userId: data.userId,
    deviceName: data.deviceName || data.userId,

    keyboardCount: keys,
    mouseMoveCount: moves,
    mouseClickCount: clicks,
    mouseScrollCount: scrolls,

    score,
    status,

    activeWindow: data.activeWindow || "Unknown",

    isActive:
        keys > 0 ||
        clicks > 0 ||
        scrolls > 0,

    isOnline: true,
    lastSeen: new Date().toISOString(),
  };

  io.emit("live-users", liveUsers);

  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("TypeMonitor server is running");
});


const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
