/**
 * In-memory room state.
 * participants: Map<socketId, participantObj>
 */
const participants = new Map();

function addParticipant(socketId, data) {
  participants.set(socketId, { socketId, ...data, lastSeen: Date.now() });
}

function updateParticipant(socketId, fields) {
  const p = participants.get(socketId);
  if (p) participants.set(socketId, { ...p, ...fields, lastSeen: Date.now() });
}

function removeParticipant(socketId) {
  participants.delete(socketId);
}

function getParticipant(socketId) {
  return participants.get(socketId) || null;
}

function getOfficeParticipants(officeId) {
  return [...participants.values()].filter((p) => p.officeId === officeId);
}

function getAllParticipants() {
  return [...participants.values()];
}

module.exports = {
  addParticipant,
  updateParticipant,
  removeParticipant,
  getParticipant,
  getOfficeParticipants,
  getAllParticipants,
};
