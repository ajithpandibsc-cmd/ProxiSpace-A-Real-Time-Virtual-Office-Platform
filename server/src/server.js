require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connectDatabase } = require("./config/database");
const initSockets = require("./sockets");
const Office = require("./models/Office");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
  pingTimeout: 30_000,
  pingInterval: 10_000,
});

async function start() {
  const dbConnected = await connectDatabase();

  if (dbConnected) {
    // Seed default office if none exists
    const count = await Office.countDocuments().catch(() => 0);
    if (count === 0) {
      await Office.create({
        name: "Main Office",
        slug: "main",
        width: 1200,
        height: 800,
        layout: {},
      }).catch(() => {});
      console.log("🏢 Default office 'main' seeded");
    }
  }

  initSockets(io);

  server.listen(PORT, () => {
    console.log(`🚀 ProxiSpeak server listening on http://localhost:${PORT}`);
    console.log(`   Accepting clients from ${CLIENT_ORIGIN}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
