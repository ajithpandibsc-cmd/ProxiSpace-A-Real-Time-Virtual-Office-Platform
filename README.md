# ProxiSpeak — Geospatial Proximity Audio Ecosystem

> **Infotact Internship Project**  
> A high-performance, browser-based virtual office featuring 2D real-time spatial navigation, obstacle collision physics, WebRTC peer-to-peer audio, distance-based volume attenuation, directional stereo panning, and acoustic wall occlusion.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)](https://socket.io)
[![WebRTC](https://img.shields.io/badge/WebRTC-Audio%20Mesh-orange.svg)](https://webrtc.org)
[![Tests](https://img.shields.io/badge/Tests-14%20Passing-brightgreen.svg)]()

---

## 1. Problem Statement & Overview

Traditional remote collaboration tools force teams into rigid, isolated video call rooms. Real-world workplaces, in contrast, allow spontaneous conversation: colleagues notice nearby team members, walk over to chat, and naturally overhear colleagues when in close proximity.

**ProxiSpeak** recreates this natural dynamic in a sleek 2D virtual office environment:
- Avatars move across custom architectural layouts with desks, acoustic boardroom walls, and lounge spaces.
- Audio volume increases smoothly as avatars approach each other and fades to silence as they walk away.
- Stereo panning realistically locates audio to the left or right ear based on the relative direction of speaking peers.
- Sound-blocking walls and glass meeting partitions attenuate sound by 65%, enabling private discussions inside conference rooms.

---

## 2. Key Features

- **Smooth 60 FPS Canvas World**: High-DPI retina rendering with ambient floor grids, architectural zones, custom desks, and lounge furniture.
- **Dual Navigation (WASD + Click-to-Move)**: Move seamlessly with keyboard arrows, WASD, or click anywhere on the canvas to navigate to that destination.
- **Obstacle Collision Detection & Axis Sliding**: Realistic physics prevent avatars from clipping through furniture and walls, smoothly sliding along unobstructed axes.
- **WebRTC Peer-to-Peer Spatial Audio**: Direct browser-to-browser audio streams with Google STUN relay.
- **Distance-Based Volume Attenuation**: Cosine-based attenuation model avoids abrupt volume clipping.
- **Directional Stereo Panning**: `StereoPannerNode` normalizes horizontal relative position from -1.0 (left) to +1.0 (right).
- **Proximity Hysteresis**: 150 px join radius with 185 px leave radius prevents audio flapping at boundaries.
- **Acoustic Occlusion**: Real-time line-of-sight intersection against sound-blocking walls dampens audio for meeting room privacy.
- **Interactive Collaborations**: Real-time voice VU meter, mute/unmute toggles, master volume slider, and floating animated emoji reactions (👋, ☕, 👍, 💡, 🔥, ❓).
- **Hybrid Storage & MongoDB Geospatial Support**: In-memory low-latency state combined with MongoDB `2dsphere` `$near` and `$geoWithin` coordinate conversion.

---

## 3. Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    React Web Client                       │
│                                                           │
│  React UI ── Canvas world ── Keyboard/mouse movement      │
│      │              │                     │               │
│      ├── Web Audio API (gain + stereo panning)             │
│      ├── WebRTC peer audio tracks                          │
│      └── Socket.IO client (positions/signaling/events)     │
└─────────────────────────┬─────────────────────────────────┘
                          │ HTTPS / WSS
┌─────────────────────────▼─────────────────────────────────┐
│                 Node.js + Express Server                  │
│                                                           │
│  Socket.IO ── validation ── movement state                 │
│      │                     │                              │
│      ├── WebRTC signaling (offer/answer/ICE)               │
│      ├── proximity engine (nearby peer selection)          │
│      └── room membership / disconnect cleanup              │
│                                                           │
│  MongoDB: office layouts, obstacles, optional geo queries  │
│  In-Memory: high-frequency real-time spatial calculations  │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

- **Frontend**: React 18, Vite, HTML5 Canvas API, Socket.IO Client, Web Audio API, Native WebRTC (`RTCPeerConnection`).
- **Backend**: Node.js, Express 5, Socket.IO 4, Mongoose 9, Helmet, CORS, Express-Rate-Limit.
- **Testing**: Native Node.js Test Runner (`node:test`, `node:assert/strict`).

---

## 5. Prerequisites & Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- Modern browser (Chrome, Edge, Firefox, Brave) with WebRTC and microphone support.
- (Optional) Local MongoDB or MongoDB Atlas URI (application includes automatic in-memory fallback if MongoDB is not active).

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd proxispeak
   ```

2. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd ../client
   npm install
   ```

### Configuration

Create `server/.env`:
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/proxispeak
NODE_ENV=development
PROXIMITY_RADIUS=150
WORLD_WIDTH=1200
WORLD_HEIGHT=800
```

---

## 6. Running the Application

### 1. Start the Backend Server:
```bash
cd server
npm run dev
```
*Backend runs on `http://localhost:4000`.*

### 2. Start the Frontend Client:
```bash
cd client
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 7. How to Test with Two Browser Sessions

1. Open **Tab 1** (`http://localhost:5173`):
   - Enter name: `Ajith`
   - Select Office: `Main Virtual HQ`
   - Click **Enter Office Space →**
   - Click **Enable Microphone** (allow browser audio permission).
2. Open **Tab 2** (Incognito window or separate profile at `http://localhost:5173`):
   - Enter name: `Colleague`
   - Select Office: `Main Virtual HQ`
   - Click **Enter Office Space →**
   - Click **Enable Microphone**.
3. **Verify Movement**: Move with `W`, `A`, `S`, `D` or click anywhere on the canvas to walk.
4. **Verify Proximity Audio**:
   - Walk avatars together (< 150 px): audio streams smoothly between both tabs.
   - Walk apart (> 150 px): audio attenuates and fades to zero.
   - Walk into the **Glass Boardroom**: audio dampens by 65% behind the acoustic wall.
5. **Verify Reactions**: Click `👋` or `☕` on the HUD to see floating reactions over avatar heads.

---

## 8. Automated Testing

Run the test suite:
```bash
cd server
npm test
```
*Executes all 14 unit and integration tests covering Euclidean distance, hysteresis boundaries, volume attenuation, panning, collision math, acoustic occlusion, GeoJSON conversion, and room lifecycle.*

---

## 9. MongoDB Geospatial Architecture

MongoDB geospatial indexes (`2dsphere`) expect GeoJSON latitude and longitude. ProxiSpeak uses a clean conversion layer:
- **Canvas to GeoJSON**: Converts canvas coordinates `[0..1200, 0..800]` into synthetic `[-0.010..+0.010, -0.006..+0.006]` degrees.
- **Low-Latency In-Memory Filtering**: Proximity checks on 50+ concurrent users occur in memory at `< 1ms` latency, eliminating database bottlenecks per movement tick.
- **Geospatial Demo API**: Test the mapping anytime via:
  ```bash
  curl "http://localhost:4000/api/spatial-demo?x=500&y=300&radius=150"
  ```

---

## 10. Documentation Index

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical blueprint, WebRTC lifecycle, and mathematical models.
- [docs/API_AND_SOCKET_EVENTS.md](docs/API_AND_SOCKET_EVENTS.md) — REST APIs and Socket.IO real-time event dictionary.
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md) — Test matrix, automated tests, and verification checklist.
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — Step-by-step walkthrough script for the internship review presentation.

---

## 11. Internship Attribution

Developed for the **Infotact Internship Project** — Geospatial Proximity Audio Ecosystem.
