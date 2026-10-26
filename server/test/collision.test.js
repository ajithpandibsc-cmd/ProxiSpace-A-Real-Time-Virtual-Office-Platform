const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Pure collision & movement logic verification
function circleCollidesWithRect(cx, cy, r, rect) {
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;
  const closestX = Math.max(rect.x, Math.min(cx, rx2));
  const closestY = Math.max(rect.y, Math.min(cy, ry2));

  const distanceX = cx - closestX;
  const distanceY = cy - closestY;
  return distanceX * distanceX + distanceY * distanceY < r * r;
}

function clampPosition(x, y, worldWidth, worldHeight, radius = 18) {
  return {
    x: Math.max(radius, Math.min(worldWidth - radius, x)),
    y: Math.max(radius, Math.min(worldHeight - radius, y)),
  };
}

function moveWithCollisions(currentPos, dx, dy, worldWidth, worldHeight, obstacles = [], radius = 18) {
  if (dx === 0 && dy === 0) return currentPos;

  const candidateFull = clampPosition(currentPos.x + dx, currentPos.y + dy, worldWidth, worldHeight, radius);
  const collidesFull = obstacles.some((obs) => circleCollidesWithRect(candidateFull.x, candidateFull.y, radius, obs));
  if (!collidesFull) return candidateFull;

  // Slide along X
  if (dx !== 0) {
    const candidateX = clampPosition(currentPos.x + dx, currentPos.y, worldWidth, worldHeight, radius);
    if (!obstacles.some((obs) => circleCollidesWithRect(candidateX.x, candidateX.y, radius, obs))) {
      return candidateX;
    }
  }

  // Slide along Y
  if (dy !== 0) {
    const candidateY = clampPosition(currentPos.x, currentPos.y + dy, worldWidth, worldHeight, radius);
    if (!obstacles.some((obs) => circleCollidesWithRect(candidateY.x, candidateY.y, radius, obs))) {
      return candidateY;
    }
  }

  return currentPos;
}

describe("Avatar Movement & Collision Resolution", () => {
  const desk = { x: 100, y: 100, width: 100, height: 60 };

  it("should detect circle collision with rectangular desk", () => {
    // Circle intersecting the desk
    assert.strictEqual(circleCollidesWithRect(120, 110, 18, desk), true);

    // Circle safely away
    assert.strictEqual(circleCollidesWithRect(50, 50, 18, desk), false);

    // Circle grazing edge within radius
    assert.strictEqual(circleCollidesWithRect(90, 120, 18, desk), true); // 10px from left edge (r=18)
  });

  it("should clamp avatar to world boundaries", () => {
    const clampedUpperLeft = clampPosition(-50, -50, 1200, 800, 18);
    assert.strictEqual(clampedUpperLeft.x, 18);
    assert.strictEqual(clampedUpperLeft.y, 18);

    const clampedLowerRight = clampPosition(1500, 999, 1200, 800, 18);
    assert.strictEqual(clampedLowerRight.x, 1200 - 18);
    assert.strictEqual(clampedLowerRight.y, 800 - 18);
  });

  it("should allow sliding along unblocked axis when running into obstacle diagonally", () => {
    // Avatar is at (80, 120), moving diagonally right+down (+5, +5) towards desk at (100, 100)
    // Target candidate (85, 125) collides horizontally (85+18 = 103 > 100)
    // Should slide down along Y axis!
    const pos = { x: 75, y: 120 };
    const moved = moveWithCollisions(pos, 10, 5, 1200, 800, [desk], 18);

    // X was blocked (75+10+18=103 > 100), but Y was free (120+5 = 125)
    assert.strictEqual(moved.y, 125);
    assert.strictEqual(moved.x, 75); // blocked in X, slid in Y
  });
});
