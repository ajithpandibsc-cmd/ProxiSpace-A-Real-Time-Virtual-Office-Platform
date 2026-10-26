const Office = require("../models/Office");
const Obstacle = require("../models/Obstacle");
const { isDbConnected } = require("../config/database");

// Pre-seeded office blueprints with rich architectural furniture and obstacles
const INITIAL_OFFICES = [
  {
    name: "Main Virtual HQ",
    slug: "main",
    width: 1200,
    height: 800,
    layout: {
      theme: "modern-tech",
      zones: [
        { id: "engineering", name: "Engineering Pod", x: 60, y: 60, width: 440, height: 320, color: "rgba(99, 102, 241, 0.08)" },
        { id: "meeting-1", name: "Glass Boardroom", x: 540, y: 60, width: 380, height: 260, color: "rgba(16, 185, 129, 0.08)" },
        { id: "lounge-zone", name: "Zen Breakout Area", x: 60, y: 440, width: 440, height: 300, color: "rgba(245, 158, 11, 0.08)" },
        { id: "executive", name: "Product & Strategy Hub", x: 540, y: 380, width: 600, height: 360, color: "rgba(139, 92, 246, 0.08)" },
      ],
    },
    obstacles: [
      // Engineering desks
      { id: "desk-1", name: "Workstation Alpha", x: 100, y: 120, width: 140, height: 70, type: "desk", blocksSound: false },
      { id: "desk-2", name: "Workstation Beta", x: 300, y: 120, width: 140, height: 70, type: "desk", blocksSound: false },
      { id: "desk-3", name: "Workstation Gamma", x: 100, y: 240, width: 140, height: 70, type: "desk", blocksSound: false },
      { id: "desk-4", name: "Workstation Delta", x: 300, y: 240, width: 140, height: 70, type: "desk", blocksSound: false },

      // Glass Boardroom Walls & Conference Table (Walls block sound!)
      { id: "conf-table", name: "Conference Table", x: 620, y: 130, width: 220, height: 110, type: "table", blocksSound: false },
      { id: "wall-boardroom-left", name: "Boardroom Acoustic Wall", x: 535, y: 60, width: 10, height: 260, type: "wall", blocksSound: true },
      { id: "wall-boardroom-bottom", name: "Boardroom Glass Partition", x: 535, y: 320, width: 385, height: 10, type: "wall", blocksSound: true },

      // Breakout Lounge Sofas & Coffee bar
      { id: "coffee-bar", name: "Espresso & Snack Bar", x: 100, y: 480, width: 160, height: 60, type: "counter", blocksSound: false },
      { id: "lounge-sofa", name: "Comfort Lounge Sectional", x: 100, y: 580, width: 220, height: 80, type: "sofa", blocksSound: false },

      // Product Hub tables
      { id: "desk-exec-1", name: "Design Pod 1", x: 600, y: 440, width: 150, height: 70, type: "desk", blocksSound: false },
      { id: "desk-exec-2", name: "Design Pod 2", x: 800, y: 440, width: 150, height: 70, type: "desk", blocksSound: false },
      { id: "presentation-screen", name: "4K Presentation Wall", x: 1000, y: 440, width: 140, height: 260, type: "screen", blocksSound: true },
    ],
  },
  {
    name: "Innovation Lab",
    slug: "lab",
    width: 1200,
    height: 800,
    layout: {
      theme: "cyber-neon",
      zones: [
        { id: "prototyping", name: "Hardware Prototyping", x: 80, y: 80, width: 500, height: 320, color: "rgba(6, 182, 212, 0.08)" },
        { id: "ai-cluster", name: "Deep Learning Research", x: 640, y: 80, width: 480, height: 640, color: "rgba(99, 102, 241, 0.08)" },
      ],
    },
    obstacles: [
      { id: "bench-1", name: "Soldering & Electronics Bench", x: 120, y: 140, width: 180, height: 80, type: "desk", blocksSound: false },
      { id: "bench-2", name: "3D Printers & Testing Rig", x: 340, y: 140, width: 180, height: 80, type: "desk", blocksSound: false },
      { id: "server-rack-1", name: "GPU Supercomputer Rack", x: 700, y: 140, width: 120, height: 180, type: "wall", blocksSound: true },
      { id: "server-rack-2", name: "Storage Array Rack", x: 860, y: 140, width: 120, height: 180, type: "wall", blocksSound: true },
    ],
  },
  {
    name: "Zen Breakout Lounge",
    slug: "lounge",
    width: 1200,
    height: 800,
    layout: {
      theme: "warm-wood",
      zones: [
        { id: "coffee-lounge", name: "Social Coffee Hub", x: 80, y: 80, width: 500, height: 640, color: "rgba(245, 158, 11, 0.08)" },
        { id: "quiet-terrace", name: "Acoustic Silence Garden", x: 640, y: 80, width: 480, height: 640, color: "rgba(16, 185, 129, 0.08)" },
      ],
    },
    obstacles: [
      { id: "island-bar", name: "Barista Counter Island", x: 180, y: 220, width: 280, height: 100, type: "counter", blocksSound: false },
      { id: "terrace-wall", name: "Acoustic Partition Wall", x: 600, y: 80, width: 14, height: 640, type: "wall", blocksSound: true },
      { id: "zen-sofa", name: "Terrace Daybeds", x: 740, y: 220, width: 240, height: 100, type: "sofa", blocksSound: false },
    ],
  },
];

// In-memory fallback map: slug -> office data
const inMemoryOffices = new Map(INITIAL_OFFICES.map((o) => [o.slug, { ...o }]));

/**
 * List all available offices
 */
async function listOffices() {
  if (isDbConnected()) {
    try {
      const dbOffices = await Office.find({}, "name slug width height layout").lean().exec();
      if (dbOffices && dbOffices.length > 0) return dbOffices;
    } catch (err) {
      console.warn("MongoDB list query failed, using in-memory store:", err.message);
    }
  }
  return Array.from(inMemoryOffices.values()).map(({ name, slug, width, height, layout }) => ({
    name,
    slug,
    width,
    height,
    layout,
  }));
}

/**
 * Get office details and obstacles by slug
 */
async function getOfficeBySlug(slug) {
  if (isDbConnected()) {
    try {
      const office = await Office.findOne({ slug }).lean().exec();
      if (office) {
        const obstacles = await Obstacle.find({ officeId: slug }).lean().exec();
        return {
          ...office,
          obstacles: obstacles && obstacles.length > 0 ? obstacles : (inMemoryOffices.get(slug)?.obstacles || []),
        };
      }
    } catch (err) {
      console.warn("MongoDB get query failed, using in-memory store:", err.message);
    }
  }
  return inMemoryOffices.get(slug) || null;
}

/**
 * Create or register an office
 */
async function createOffice({ name, slug, width = 1200, height = 800, layout = {}, obstacles = [] }) {
  const officeDoc = {
    name,
    slug,
    width,
    height,
    layout,
    obstacles,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryOffices.set(slug, officeDoc);

  if (isDbConnected()) {
    try {
      const created = await Office.create({ name, slug, width, height, layout });
      if (obstacles && obstacles.length > 0) {
        await Obstacle.insertMany(
          obstacles.map((obs) => ({
            officeId: slug,
            name: obs.name || "Obstacle",
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height,
            blocksSound: Boolean(obs.blocksSound),
          }))
        ).catch(() => {});
      }
      return created;
    } catch (err) {
      console.warn("MongoDB create failed, saved in-memory:", err.message);
    }
  }

  return officeDoc;
}

/**
 * Update office layout & obstacles
 */
async function updateOfficeLayout(slug, layout, obstacles) {
  const existing = inMemoryOffices.get(slug) || { name: slug, slug, width: 1200, height: 800 };
  existing.layout = layout || existing.layout;
  if (obstacles) existing.obstacles = obstacles;
  existing.updatedAt = new Date();
  inMemoryOffices.set(slug, existing);

  if (isDbConnected()) {
    try {
      await Office.findOneAndUpdate({ slug }, { layout, updatedAt: new Date() }).exec();
      if (obstacles) {
        await Obstacle.deleteMany({ officeId: slug }).exec();
        await Obstacle.insertMany(
          obstacles.map((obs) => ({
            officeId: slug,
            name: obs.name,
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height,
            blocksSound: obs.blocksSound,
          }))
        );
      }
    } catch (err) {
      console.warn("MongoDB update failed, updated in-memory:", err.message);
    }
  }

  return existing;
}

/**
 * Geospatial conversion and demonstration helper
 * As specified in Section 9 of the Project Guide:
 * Maps 2D virtual office plane [0..1200, 0..800] into synthetic GeoJSON [lng, lat]
 * Lng range: [-0.010, +0.010], Lat range: [-0.006, +0.006]
 */
function canvasToGeoJSON(x, y, worldWidth = 1200, worldHeight = 800) {
  const lng = ((x / worldWidth) - 0.5) * 0.02; // degrees longitude
  const lat = ((y / worldHeight) - 0.5) * 0.012; // degrees latitude
  return {
    type: "Point",
    coordinates: [Number(lng.toFixed(7)), Number(lat.toFixed(7))],
  };
}

function geoJSONToCanvas(coordinates, worldWidth = 1200, worldHeight = 800) {
  const [lng, lat] = coordinates;
  const x = (lng / 0.02 + 0.5) * worldWidth;
  const y = (lat / 0.012 + 0.5) * worldHeight;
  return { x: Math.round(x), y: Math.round(y) };
}

module.exports = {
  listOffices,
  getOfficeBySlug,
  createOffice,
  updateOfficeLayout,
  canvasToGeoJSON,
  geoJSONToCanvas,
  INITIAL_OFFICES,
};
