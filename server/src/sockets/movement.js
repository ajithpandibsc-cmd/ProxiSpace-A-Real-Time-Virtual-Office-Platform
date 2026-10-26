const roomState = require("../services/roomState");
const { validateMove } = require("../utils/validation");
const { getNearbyParticipants } = require("../services/proximity");

const WORLD_WIDTH = parseInt(process.env.WORLD_WIDTH || "1200", 10);
const WORLD_HEIGHT = parseInt(process.env.WORLD_HEIGHT || "800", 10);
const PROXIMITY_RADIUS = parseInt(process.env.PROXIMITY_RADIUS || "150", 10);

// Rate-limit: one movement broadcast per this many ms per socket
const MOVE_INTERVAL = 50; // ~20 fps server-side
const lastMove = new Map();

module.exports = function registerMovement(io, socket) {
  socket.on("participant:move", (payload) => {
    const now = Date.now();
    const prev = lastMove.get(socket.id) || 0;
    if (now - prev < MOVE_INTERVAL) return; // rate-limit
    lastMove.set(socket.id, now);

    const err = validateMove(payload, WORLD_WIDTH, WORLD_HEIGHT);
    if (err) {
      socket.emit("server:error", { message: err });
      return;
    }

    const { x, y } = payload;
    roomState.updateParticipant(socket.id, { x, y });

    const p = roomState.getParticipant(socket.id);
    if (!p) return;

    // Broadcast authoritative position to the same office room
    io.to(p.officeId).emit("participant:moved", {
      socketId: socket.id,
      x,
      y,
    });

    // Compute and broadcast proximity update for this participant
    const officeParticipants = roomState.getOfficeParticipants(p.officeId);
    const nearby = getNearbyParticipants(p, officeParticipants, PROXIMITY_RADIUS);
    socket.emit("proximity:update", {
      nearby: nearby.map((n) => ({
        socketId: n.socketId,
        x: n.x,
        y: n.y,
        displayName: n.displayName,
        muted: n.muted,
      })),
    });

    // Also update nearby peers with their proximity to this mover
    for (const peer of nearby) {
      const peerSocket = io.sockets.sockets.get(peer.socketId);
      if (!peerSocket) continue;
      const peerNearby = getNearbyParticipants(peer, officeParticipants, PROXIMITY_RADIUS);
      peerSocket.emit("proximity:update", {
        nearby: peerNearby.map((n) => ({
          socketId: n.socketId,
          x: n.x,
          y: n.y,
          displayName: n.displayName,
          muted: n.muted,
        })),
      });
    }
  });

  socket.on("participant:mute", ({ muted }) => {
    const p = roomState.getParticipant(socket.id);
    if (!p) return;
    roomState.updateParticipant(socket.id, { muted: Boolean(muted) });
    io.to(p.officeId).emit("participant:muted", { socketId: socket.id, muted: Boolean(muted) });
  });
};
