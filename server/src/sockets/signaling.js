/**
 * WebRTC signaling relay — forwards SDP offers/answers and ICE candidates
 * between peers who are in the same office.
 */

const roomState = require("../services/roomState");

module.exports = function registerSignaling(io, socket) {
  socket.on("webrtc:offer", ({ to, offer }) => {
    const sender = roomState.getParticipant(socket.id);
    const target = roomState.getParticipant(to);
    if (!sender || !target) return;
    if (sender.officeId !== target.officeId) return; // block cross-office signaling
    io.to(to).emit("webrtc:offer", { from: socket.id, offer });
  });

  socket.on("webrtc:answer", ({ to, answer }) => {
    const sender = roomState.getParticipant(socket.id);
    const target = roomState.getParticipant(to);
    if (!sender || !target) return;
    if (sender.officeId !== target.officeId) return;
    io.to(to).emit("webrtc:answer", { from: socket.id, answer });
  });

  socket.on("webrtc:ice-candidate", ({ to, candidate }) => {
    const sender = roomState.getParticipant(socket.id);
    const target = roomState.getParticipant(to);
    if (!sender || !target) return;
    if (sender.officeId !== target.officeId) return;
    io.to(to).emit("webrtc:ice-candidate", { from: socket.id, candidate });
  });
};
