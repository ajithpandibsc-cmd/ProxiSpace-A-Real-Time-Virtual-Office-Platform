/**
 * Proximity engine: Euclidean distance in canvas coordinates.
 * JOIN_RADIUS  — start audio when closer than this
 * LEAVE_RADIUS — stop audio when farther than this (hysteresis)
 */

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getNearbyParticipants(current, allInOffice, radius) {
  return allInOffice.filter((other) => {
    if (other.socketId === current.socketId) return false;
    return distance(current, other) <= radius;
  });
}

/**
 * Apply hysteresis: only add/remove from active set based on join/leave radii.
 * Returns { toAdd: string[], toRemove: string[] }
 */
function diffProximity(current, allInOffice, activePeerIds, joinRadius, leaveRadius) {
  const toAdd = [];
  const toRemove = [];

  for (const other of allInOffice) {
    if (other.socketId === current.socketId) continue;
    const d = distance(current, other);
    const isActive = activePeerIds.has(other.socketId);

    if (!isActive && d <= joinRadius) {
      toAdd.push(other.socketId);
    } else if (isActive && d > leaveRadius) {
      toRemove.push(other.socketId);
    }
  }

  return { toAdd, toRemove };
}

/**
 * Volume (gain) for distance-based attenuation.
 * Smooth falloff using cosine curve.
 */
function volumeForDistance(d, radius) {
  if (d >= radius) return 0;
  const ratio = d / radius;
  return Math.max(0, 0.5 * (1 + Math.cos(Math.PI * ratio)));
}

/**
 * Stereo pan: -1 (left) to +1 (right)
 */
function panForRelativeX(relativeX, radius) {
  if (radius <= 0) return 0;
  return Math.max(-1, Math.min(1, relativeX / radius));
}

/**
 * Line segment intersection test
 */
function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (det === 0) return false;
  const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  return 0 <= lambda && lambda <= 1 && 0 <= gamma && gamma <= 1;
}

/**
 * Check if a segment from (x1, y1) to (x2, y2) intersects a rectangle
 */
function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;

  // If either point is inside the rect
  if (
    (x1 >= rect.x && x1 <= rx2 && y1 >= rect.y && y1 <= ry2) ||
    (x2 >= rect.x && x2 <= rx2 && y2 >= rect.y && y2 <= ry2)
  ) {
    return true;
  }

  return (
    linesIntersect(x1, y1, x2, y2, rect.x, rect.y, rx2, rect.y) ||
    linesIntersect(x1, y1, x2, y2, rx2, rect.y, rx2, ry2) ||
    linesIntersect(x1, y1, x2, y2, rx2, ry2, rect.x, ry2) ||
    linesIntersect(x1, y1, x2, y2, rect.x, ry2, rect.x, rect.y)
  );
}

/**
 * Audio occlusion: if a sound-blocking obstacle (wall/partition)
 * sits between two avatars, attenuate the volume.
 */
function checkAudioOcclusion(posA, posB, obstacles = []) {
  if (!obstacles || obstacles.length === 0) return 1.0;
  let factor = 1.0;
  for (const obs of obstacles) {
    if (obs.blocksSound && segmentIntersectsRect(posA.x, posA.y, posB.x, posB.y, obs)) {
      factor *= 0.35; // 65% attenuation per acoustic wall
    }
  }
  return factor;
}

module.exports = {
  distance,
  getNearbyParticipants,
  diffProximity,
  volumeForDistance,
  panForRelativeX,
  segmentIntersectsRect,
  checkAudioOcclusion,
};

