const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  distance,
  getNearbyParticipants,
  diffProximity,
  volumeForDistance,
  panForRelativeX,
  segmentIntersectsRect,
  checkAudioOcclusion,
} = require("../src/services/proximity");

const { validateJoin, validateMove, sanitizeName } = require("../src/utils/validation");
const { canvasToGeoJSON, geoJSONToCanvas } = require("../src/services/officeStore");
const roomState = require("../src/services/roomState");

describe("ProxiSpeak Proximity & Audio Spatialization Engine", () => {
  it("should calculate correct Euclidean distance", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 30, y: 40 };
    assert.strictEqual(distance(a, b), 50);
  });

  it("should identify nearby participants within radius", () => {
    const self = { socketId: "self", x: 100, y: 100 };
    const p1 = { socketId: "p1", x: 150, y: 100 }; // dist = 50 (within 100)
    const p2 = { socketId: "p2", x: 300, y: 300 }; // dist = ~282 (outside 100)
    const pSelf = { socketId: "self", x: 100, y: 100 }; // same id should be excluded

    const nearby = getNearbyParticipants(self, [p1, p2, pSelf], 100);
    assert.strictEqual(nearby.length, 1);
    assert.strictEqual(nearby[0].socketId, "p1");
  });

  it("should apply hysteresis without connection flapping", () => {
    const self = { socketId: "self", x: 100, y: 100 };
    const p1 = { socketId: "p1", x: 210, y: 100 }; // dist = 110 (between join 100 and leave 130)

    // Case 1: p1 is not yet active -> should NOT be added at dist 110 (> joinRadius 100)
    const activeEmpty = new Set();
    const diff1 = diffProximity(self, [p1], activeEmpty, 100, 130);
    assert.deepStrictEqual(diff1.toAdd, []);
    assert.deepStrictEqual(diff1.toRemove, []);

    // Case 2: p1 is already active -> should NOT be removed at dist 110 (<= leaveRadius 130)
    const activeWithP1 = new Set(["p1"]);
    const diff2 = diffProximity(self, [p1], activeWithP1, 100, 130);
    assert.deepStrictEqual(diff2.toAdd, []);
    assert.deepStrictEqual(diff2.toRemove, []);

    // Case 3: p1 steps closer to 90 -> should be added
    const p1Near = { socketId: "p1", x: 190, y: 100 }; // dist = 90
    const diff3 = diffProximity(self, [p1Near], activeEmpty, 100, 130);
    assert.deepStrictEqual(diff3.toAdd, ["p1"]);

    // Case 4: p1 walks away to 140 -> should be removed
    const p1Far = { socketId: "p1", x: 240, y: 100 }; // dist = 140
    const diff4 = diffProximity(self, [p1Far], activeWithP1, 100, 130);
    assert.deepStrictEqual(diff4.toRemove, ["p1"]);
  });

  it("should attenuate volume smoothly with distance", () => {
    const radius = 100;
    // At distance 0, volume is max (1.0)
    assert.ok(Math.abs(volumeForDistance(0, radius) - 1.0) < 0.001);
    // At boundary, volume is 0
    assert.strictEqual(volumeForDistance(100, radius), 0);
    // Beyond boundary, volume is 0
    assert.strictEqual(volumeForDistance(120, radius), 0);
    // Halfway, volume is smooth intermediate (0.5)
    assert.ok(Math.abs(volumeForDistance(50, radius) - 0.5) < 0.001);
  });

  it("should compute accurate stereo panning", () => {
    const radius = 150;
    // Centered
    assert.strictEqual(panForRelativeX(0, radius), 0);
    // Fully left
    assert.strictEqual(panForRelativeX(-150, radius), -1);
    // Fully right
    assert.strictEqual(panForRelativeX(150, radius), 1);
    // Clamped beyond right
    assert.strictEqual(panForRelativeX(200, radius), 1);
  });

  it("should detect line-of-sight intersection with acoustic walls", () => {
    const wall = { x: 50, y: 0, width: 10, height: 100, blocksSound: true };

    // Segment passes directly through the wall
    assert.strictEqual(segmentIntersectsRect(20, 50, 80, 50, wall), true);

    // Segment stays to the left of the wall
    assert.strictEqual(segmentIntersectsRect(10, 20, 30, 80, wall), false);

    // Occlusion factor should attenuate volume when blocked
    const posA = { x: 20, y: 50 };
    const posB = { x: 80, y: 50 };
    const factorBlocked = checkAudioOcclusion(posA, posB, [wall]);
    assert.strictEqual(factorBlocked, 0.35);

    const posC = { x: 20, y: 20 };
    const posD = { x: 30, y: 80 };
    const factorClear = checkAudioOcclusion(posC, posD, [wall]);
    assert.strictEqual(factorClear, 1.0);
  });
});

describe("Input Validation & Bounds Checking", () => {
  it("should validate join payload correctly", () => {
    assert.strictEqual(validateJoin({ displayName: "Ajith", officeId: "main" }), null);
    assert.ok(validateJoin({ displayName: "", officeId: "main" }) !== null);
    assert.ok(validateJoin({ displayName: "a".repeat(40), officeId: "main" }) !== null);
    assert.ok(validateJoin(null) !== null);
  });

  it("should sanitize display names", () => {
    assert.strictEqual(sanitizeName("   Sarah Connor   "), "Sarah Connor");
  });

  it("should validate movement bounds", () => {
    assert.strictEqual(validateMove({ x: 100, y: 200 }, 1200, 800), null);
    assert.ok(validateMove({ x: -10, y: 200 }, 1200, 800) !== null);
    assert.ok(validateMove({ x: 100, y: 900 }, 1200, 800) !== null);
    assert.ok(validateMove({ x: "invalid", y: 200 }, 1200, 800) !== null);
  });
});

describe("MongoDB GeoJSON Conversion Layer", () => {
  it("should convert canvas coordinates to GeoJSON Point and back", () => {
    const x = 600;
    const y = 400;
    const geo = canvasToGeoJSON(x, y, 1200, 800);

    assert.strictEqual(geo.type, "Point");
    assert.strictEqual(geo.coordinates.length, 2);
    // Center of map maps to approx [0, 0]
    assert.strictEqual(geo.coordinates[0], 0);
    assert.strictEqual(geo.coordinates[1], 0);

    const reconverted = geoJSONToCanvas(geo.coordinates, 1200, 800);
    assert.strictEqual(reconverted.x, 600);
    assert.strictEqual(reconverted.y, 400);
  });
});

describe("Room State Lifecycle Management", () => {
  it("should add, retrieve, update, and remove participants", () => {
    const testId = "test-socket-999";
    roomState.addParticipant(testId, {
      displayName: "Tester",
      officeId: "office-test",
      x: 150,
      y: 250,
      muted: false,
    });

    const participant = roomState.getParticipant(testId);
    assert.ok(participant);
    assert.strictEqual(participant.displayName, "Tester");

    roomState.updateParticipant(testId, { x: 200, muted: true });
    const updated = roomState.getParticipant(testId);
    assert.strictEqual(updated.x, 200);
    assert.strictEqual(updated.muted, true);

    const inOffice = roomState.getOfficeParticipants("office-test");
    assert.strictEqual(inOffice.length, 1);

    roomState.removeParticipant(testId);
    assert.strictEqual(roomState.getParticipant(testId), null);
  });
});
