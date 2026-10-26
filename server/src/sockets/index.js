const roomState = require("../services/roomState");
const { validateJoin, sanitizeName } = require("../utils/validation");
const registerMovement = require("./movement");
const registerSignaling = require("./signaling");

const WORLD_WIDTH = parseInt(process.env.WORLD_WIDTH || "1200", 10);
const WORLD_HEIGHT = parseInt(process.env.WORLD_HEIGHT || "800", 10);

const officeStore = require("../services/officeStore");

module.exports = function initSockets(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on("office:join", async (payload) => {
      const err = validateJoin(payload);
      if (err) {
        socket.emit("server:error", { message: err });
        return;
      }

      const displayName = sanitizeName(payload.displayName);
      const officeId = payload.officeId;

      // Fetch office layout and obstacles
      const officeData = await officeStore.getOfficeBySlug(officeId) || {
        name: officeId,
        slug: officeId,
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        layout: {},
        obstacles: [],
      };

      const worldW = officeData.width || WORLD_WIDTH;
      const worldH = officeData.height || WORLD_HEIGHT;

      // Default spawn position near centre
      const x = worldW / 2 + Math.floor((Math.random() - 0.5) * 200);
      const y = worldH / 2 + Math.floor((Math.random() - 0.5) * 200);

      roomState.addParticipant(socket.id, { displayName, officeId, x, y, muted: false });
      socket.join(officeId);

      const allInOffice = roomState.getOfficeParticipants(officeId);

      // Confirm join to this socket with office layout & obstacles
      socket.emit("office:joined", {
        selfId: socket.id,
        participants: allInOffice.map((p) => ({
          socketId: p.socketId,
          displayName: p.displayName,
          x: p.x,
          y: p.y,
          muted: p.muted,
        })),
        worldWidth: worldW,
        worldHeight: worldH,
        office: officeData,
      });

      // Announce new participant to everyone else
      socket.to(officeId).emit("participant:joined", {
        socketId: socket.id,
        displayName,
        x,
        y,
        muted: false,
      });

      console.log(`👤 ${displayName} (${socket.id}) joined office ${officeId}`);
    });

    socket.on("participant:reaction", ({ emoji }) => {
      const p = roomState.getParticipant(socket.id);
      if (!p) return;
      io.to(p.officeId).emit("participant:reaction", {
        socketId: socket.id,
        emoji: String(emoji).slice(0, 8),
      });
    });

    socket.on("office:leave", () => handleDisconnect(socket, io));
    socket.on("disconnect", () => handleDisconnect(socket, io));

    registerMovement(io, socket);
    registerSignaling(io, socket);
  });
};

function handleDisconnect(socket, io) {
  const p = roomState.getParticipant(socket.id);
  if (!p) return;
  console.log(`👋 ${p.displayName} (${socket.id}) left office ${p.officeId}`);
  io.to(p.officeId).emit("participant:left", { socketId: socket.id });
  roomState.removeParticipant(socket.id);
  socket.leave(p.officeId);
}
