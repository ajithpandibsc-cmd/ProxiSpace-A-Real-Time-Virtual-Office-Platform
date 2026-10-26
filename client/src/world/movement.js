/**
 * Avatar movement logic: keyboard input, click-to-move,
 * bounds clamping, and obstacle collision detection with sliding.
 */

const SPEED = 3.5; // pixels per frame
const AVATAR_RADIUS = 18;

const keysDown = new Set();
let clickTarget = null; // { x, y }

export function registerKeyListeners() {
  const onKeyDown = (e) => {
    // Don't intercept when typing in inputs
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
    const key = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
      keysDown.add(key);
      clickTarget = null; // Keyboard overrides click navigation
    }
  };

  const onKeyUp = (e) => {
    keysDown.delete(e.key.toLowerCase());
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

export function setClickTarget(x, y) {
  clickTarget = { x, y };
}

export function clearClickTarget() {
  clickTarget = null;
}

export function getClickTarget() {
  return clickTarget;
}

/**
 * Returns { dx, dy } for current keys pressed or towards click target.
 * Normalises diagonal movement.
 */
export function computeMovementDelta(currentPos = null) {
  let dx = 0;
  let dy = 0;

  if (keysDown.has("w") || keysDown.has("arrowup")) dy -= 1;
  if (keysDown.has("s") || keysDown.has("arrowdown")) dy += 1;
  if (keysDown.has("a") || keysDown.has("arrowleft")) dx -= 1;
  if (keysDown.has("d") || keysDown.has("arrowright")) dx += 1;

  // Keyboard active
  if (dx !== 0 || dy !== 0) {
    if (dx !== 0 && dy !== 0) {
      const len = Math.SQRT2;
      dx /= len;
      dy /= len;
    }
    return { dx: dx * SPEED, dy: dy * SPEED };
  }

  // Click-to-move active
  if (clickTarget && currentPos) {
    const toX = clickTarget.x - currentPos.x;
    const toY = clickTarget.y - currentPos.y;
    const dist = Math.hypot(toX, toY);

    if (dist <= SPEED) {
      // Reached target
      clickTarget = null;
      return { dx: toX, dy: toY };
    } else {
      return {
        dx: (toX / dist) * SPEED,
        dy: (toY / dist) * SPEED,
      };
    }
  }

  return { dx: 0, dy: 0 };
}

/**
 * Check if avatar circle (cx, cy, r) collides with obstacle rectangle
 */
export function circleCollidesWithRect(cx, cy, r, rect) {
  // Find closest point to circle within the rectangle
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;
  const closestX = Math.max(rect.x, Math.min(cx, rx2));
  const closestY = Math.max(rect.y, Math.min(cy, ry2));

  // Calculate distance between circle's center and closest point
  const distanceX = cx - closestX;
  const distanceY = cy - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  return distanceSquared < r * r;
}

/**
 * Check collision against all obstacles in list
 */
export function checkObstacleCollision(cx, cy, r, obstacles = []) {
  if (!obstacles || obstacles.length === 0) return false;
  for (const obs of obstacles) {
    if (circleCollidesWithRect(cx, cy, r, obs)) {
      return true;
    }
  }
  return false;
}

/**
 * Bounds clamping
 */
export function clampPosition(x, y, worldWidth, worldHeight, radius = AVATAR_RADIUS) {
  return {
    x: Math.max(radius, Math.min(worldWidth - radius, x)),
    y: Math.max(radius, Math.min(worldHeight - radius, y)),
  };
}

/**
 * Move avatar with obstacle collision handling & axis sliding
 */
export function moveWithCollisions(currentPos, dx, dy, worldWidth, worldHeight, obstacles = [], radius = AVATAR_RADIUS) {
  if (dx === 0 && dy === 0) return currentPos;

  // Clamped target candidate
  const candidateFull = clampPosition(currentPos.x + dx, currentPos.y + dy, worldWidth, worldHeight, radius);

  // If full movement has no collision, accept it!
  if (!checkObstacleCollision(candidateFull.x, candidateFull.y, radius, obstacles)) {
    return candidateFull;
  }

  // Otherwise, attempt sliding along X-axis
  if (dx !== 0) {
    const candidateX = clampPosition(currentPos.x + dx, currentPos.y, worldWidth, worldHeight, radius);
    if (!checkObstacleCollision(candidateX.x, candidateX.y, radius, obstacles)) {
      return candidateX;
    }
  }

  // Attempt sliding along Y-axis
  if (dy !== 0) {
    const candidateY = clampPosition(currentPos.x, currentPos.y + dy, worldWidth, worldHeight, radius);
    if (!checkObstacleCollision(candidateY.x, candidateY.y, radius, obstacles)) {
      return candidateY;
    }
  }

  // Blocked in both directions
  if (clickTarget) clickTarget = null; // stop click navigation if stuck
  return currentPos;
}
