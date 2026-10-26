/**
 * Payload validation helpers.
 */

const DISPLAY_NAME_MAX = 32;

function validateJoin(payload) {
  if (!payload || typeof payload !== "object") return "Invalid payload";
  if (!payload.displayName || typeof payload.displayName !== "string")
    return "displayName is required";
  const name = payload.displayName.trim();
  if (name.length === 0) return "displayName cannot be empty";
  if (name.length > DISPLAY_NAME_MAX)
    return `displayName must be at most ${DISPLAY_NAME_MAX} characters`;
  if (!payload.officeId || typeof payload.officeId !== "string")
    return "officeId is required";
  return null;
}

function validateMove(payload, worldWidth, worldHeight) {
  if (!payload || typeof payload !== "object") return "Invalid payload";
  const x = Number(payload.x);
  const y = Number(payload.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "x/y must be numbers";
  if (x < 0 || x > worldWidth || y < 0 || y > worldHeight)
    return "Position out of bounds";
  return null;
}

function sanitizeName(name) {
  return name.trim().substring(0, DISPLAY_NAME_MAX);
}

module.exports = { validateJoin, validateMove, sanitizeName };
