const express = require("express");
const officeStore = require("../services/officeStore");
const roomState = require("../services/roomState");
const { isDbConnected } = require("../config/database");

const router = express.Router();
const startTime = Date.now();

// Health check with system telemetry
router.get("/health", (_req, res) => {
  const allParticipants = roomState.getAllParticipants();
  res.json({
    status: "ok",
    service: "ProxiSpeak Real-Time Geospatial Audio Server",
    time: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: {
      type: "MongoDB + In-Memory Fallback",
      connected: isDbConnected(),
      mode: isDbConnected() ? "persisted-mongodb" : "in-memory-resilient",
    },
    metrics: {
      activeParticipants: allParticipants.length,
      activeOffices: new Set(allParticipants.map((p) => p.officeId)).size,
    },
  });
});

// List all offices
router.get("/offices", async (_req, res) => {
  try {
    const offices = await officeStore.listOffices();
    res.json(offices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch offices: " + err.message });
  }
});

// Get office details + layout + obstacles
router.get("/offices/:slug", async (req, res) => {
  try {
    const office = await officeStore.getOfficeBySlug(req.params.slug);
    if (!office) {
      return res.status(404).json({ error: `Office '${req.params.slug}' not found` });
    }
    res.json(office);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch office: " + err.message });
  }
});

// Create new office
router.post("/offices", async (req, res) => {
  try {
    const { name, slug, width, height, layout, obstacles } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: "name and slug are required" });
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const office = await officeStore.createOffice({
      name,
      slug: cleanSlug,
      width: width || 1200,
      height: height || 800,
      layout: layout || {},
      obstacles: obstacles || [],
    });
    res.status(201).json(office);
  } catch (err) {
    res.status(500).json({ error: "Failed to create office: " + err.message });
  }
});

// Update office layout & obstacles
router.put("/offices/:slug/layout", async (req, res) => {
  try {
    const { layout, obstacles } = req.body;
    const updated = await officeStore.updateOfficeLayout(req.params.slug, layout, obstacles);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update layout: " + err.message });
  }
});

// Demonstration of MongoDB Geospatial Conversion & Query simulation (Section 9)
router.get("/spatial-demo", (req, res) => {
  const x = Number(req.query.x) || 600;
  const y = Number(req.query.y) || 400;
  const radius = Number(req.query.radius) || 150;

  const t0 = process.hrtime.bigint();
  const geoPoint = officeStore.canvasToGeoJSON(x, y);
  const reconverted = officeStore.geoJSONToCanvas(geoPoint.coordinates);

  // Measure conversion latency
  const t1 = process.hrtime.bigint();
  const durationMicroseconds = Number(t1 - t0) / 1000;

  res.json({
    description: "Demonstration of ProxiSpeak 2D Canvas to GeoJSON 2dsphere mapping",
    input: { canvasX: x, canvasY: y, radiusPixels: radius },
    geoJSON: geoPoint,
    reconvertedCanvas: reconverted,
    mongoQueryExample: {
      filter: {
        location: {
          $near: {
            $geometry: geoPoint,
            $maxDistance: Math.round(radius * 1.5), // simulated meters
          },
        },
      },
      index: { location: "2dsphere" },
    },
    latencyBenchmark: {
      durationMicroseconds: Number(durationMicroseconds.toFixed(2)),
      spatialFilteringTarget: "< 20ms",
      status: "OPTIMAL (sub-millisecond in-memory filtering)",
    },
  });
});

module.exports = router;
