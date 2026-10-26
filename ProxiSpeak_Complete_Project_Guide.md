# ProxiSpeak — Complete Project Development Guide

> **Project:** ProxiSpeak — Geospatial Proximity Audio Ecosystem  
> **Context:** Internship project at Infotact  
> **Goal:** Build a browser-based virtual office where people can move avatars around a 2D map and hear nearby colleagues naturally. Audio should become louder as avatars approach and quieter as they move away.  
> **Document status:** End-to-end implementation plan and technical blueprint. Treat performance targets as goals to validate, not as guarantees.

---

## 1. Project Overview

### 1.1 Problem Statement

Traditional remote collaboration tools often place people into fixed meeting rooms. Real offices are more fluid: people can hear nearby conversations and walk over to join them. ProxiSpeak recreates that experience in a virtual office.

### 1.2 Main User Experience

1. A user opens ProxiSpeak in a supported browser.
2. The user signs in or enters a display name and joins a virtual office.
3. The browser displays a 2D office map and the user's avatar.
4. The user moves with the keyboard or mouse.
5. The server broadcasts avatar coordinates to other participants.
6. The server calculates which users are within the configured proximity radius.
7. The application establishes or maintains audio connections for nearby peers.
8. The frontend adjusts volume and stereo panning according to distance and relative direction.
9. Users can mute their microphone, control their output volume, and leave the office.

### 1.3 Target Outcomes from the Brief

- React + HTML Canvas for the virtual office.
- Node.js + Express for the backend.
- Socket.IO for real-time signaling and movement events.
- MongoDB geospatial queries (`$near`, `$geoWithin`) for proximity calculations and room persistence.
- WebRTC for peer-to-peer audio.
- Web Audio API for distance-based attenuation and left/right stereo positioning.
- Redis Pub/Sub as a later scaling enhancement for multiple backend instances.
- Target of 50+ concurrent users in one virtual space.
- Proposed proximity radius: 100 canvas pixels (configurable).
- Proposed performance objective: spatial filtering under 20 ms and rendering near 60 FPS on a suitable device. Measure these under load; do not assume they are achieved automatically.

---

## 2. Features and Scope

### 2.1 MVP Features

- Join a virtual office with a display name.
- Live 2D map and avatar movement.
- Real-time position broadcasting.
- Server-authoritative proximity calculation.
- Proximity-based WebRTC audio setup.
- Dynamic audio volume based on distance.
- Basic stereo panning based on horizontal direction.
- Microphone permission and mute/unmute.
- Participant list and connection status.
- Leave office and clean up connections.
- Persist office layout and sound-blocking obstacles in MongoDB.
- Clear handling for microphone denial, browser incompatibility, disconnects, and network failures.

### 2.2 Recommended Additional Features

- Keyboard accessibility and visible movement controls.
- Display name editing.
- Optional push-to-talk.
- User-selected microphone/output where supported.
- “Nearby” indicator and connection state.
- Configurable audio radius and maximum volume.
- Admin-only layout editing (optional).
- Basic telemetry for latency, peer count, and errors.
- Authentication and authorization before production deployment.

### 2.3 Out of Scope for the First Version

- Video calls.
- Screen sharing.
- Recording conversations.
- Complex 3D rendering.
- Full enterprise identity management.
- Guaranteed support for every browser or device.

---

## 3. Architecture

```text
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
│  Redis Pub/Sub adapter: multi-instance Socket.IO (later)   │
└───────────────────────────────────────────────────────────┘
```

### 3.1 Important Design Decision: Canvas Coordinates vs MongoDB GeoJSON

The brief describes X/Y coordinates and MongoDB geospatial queries. MongoDB geospatial indexes operate on geographic coordinates, not arbitrary canvas pixels. Do **not** directly treat canvas pixels as latitude/longitude.

Recommended approach:

- Keep the live movement state in memory on the Node.js server for low-latency updates.
- Use a dedicated spatial grid or spatial index for frequent in-memory proximity checks.
- Use MongoDB `$near` / `$geoWithin` for persisted spatial data, office layout queries, or if the project rubric explicitly requires a geospatial query demonstration.
- If using MongoDB geospatial queries for avatar positions, map virtual-world coordinates to a documented local coordinate system and convert them to valid GeoJSON coordinates carefully. This is a simulation, not real GPS.
- Explain this design choice in the project report: a database query for every movement packet may add latency and load; the in-memory engine is better suited to high-frequency real-time updates.

This hybrid design retains the requested MongoDB geospatial component while avoiding a database round-trip for every animation frame.

---

## 4. Suggested Technology Stack

### Frontend

- React + Vite
- JavaScript (use TypeScript if required by the team)
- HTML Canvas API
- Socket.IO Client
- Native WebRTC APIs
- Web Audio API (`AudioContext`, `GainNode`, `StereoPannerNode`)
- CSS Modules or plain CSS; Tailwind is optional

### Backend

- Node.js (current LTS)
- Express
- Socket.IO
- MongoDB + Mongoose
- `dotenv`
- `helmet`
- `cors`
- `express-rate-limit`
- `zod` or equivalent validation library

### Optional Scaling

- Redis
- Socket.IO Redis adapter
- TURN server for WebRTC networks that cannot connect peer-to-peer directly

### Testing / Quality

- Vitest + React Testing Library
- Node test runner or Jest
- Playwright for browser-level tests
- ESLint + Prettier

---

## 5. Repository and Folder Structure

```text
proxispeak/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── AppHeader.jsx
│   │   │   ├── JoinForm.jsx
│   │   │   ├── ParticipantList.jsx
│   │   │   ├── AudioControls.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   ├── useMicrophone.js
│   │   │   └── useProximityAudio.js
│   │   ├── world/
│   │   │   ├── VirtualOffice.jsx
│   │   │   ├── drawWorld.js
│   │   │   ├── movement.js
│   │   │   └── coordinates.js
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── models/
│   │   │   ├── Office.js
│   │   │   └── Obstacle.js
│   │   ├── routes/
│   │   │   └── health.js
│   │   ├── sockets/
│   │   │   ├── index.js
│   │   │   ├── movement.js
│   │   │   └── signaling.js
│   │   ├── services/
│   │   │   ├── proximity.js
│   │   │   └── roomState.js
│   │   ├── utils/
│   │   │   └── validation.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_AND_SOCKET_EVENTS.md
│   ├── TEST_PLAN.md
│   └── DEMO_SCRIPT.md
├── .gitignore
└── README.md
```

---

## 6. Setup Requirements

Install:

- Node.js LTS and npm.
- Git.
- MongoDB locally or a MongoDB Atlas database.
- A modern browser with WebRTC and Web Audio API support.
- Optional Redis for the multi-instance stage.

Verify installations:

```bash
node --version
npm --version
git --version
```

Create the project folders:

```bash
mkdir proxispeak
cd proxispeak
mkdir client server docs
```

Create a Vite React client:

```bash
npm create vite@latest client -- --template react
```

Create the Express server:

```bash
cd server
npm init -y
npm install express socket.io mongoose dotenv cors helmet express-rate-limit
npm install --save-dev nodemon
```

Set the frontend up:

```bash
cd ../client
npm install
npm install socket.io-client
```

> Use the package versions compatible with your installed Node.js version. Commit the lockfiles so the team installs reproducibly.

---

## 7. Environment Configuration

Create `server/.env` locally (never commit it):

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/proxispeak
NODE_ENV=development
PROXIMITY_RADIUS=100
WORLD_WIDTH=1200
WORLD_HEIGHT=800
```

For MongoDB Atlas, replace `MONGODB_URI` with your own Atlas connection string. Keep credentials private.

Create `server/.env.example` with safe placeholders:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/proxispeak
NODE_ENV=development
PROXIMITY_RADIUS=100
WORLD_WIDTH=1200
WORLD_HEIGHT=800
```

Do not expose MongoDB credentials, TURN credentials, or private API keys in frontend code or GitHub.

---

## 8. Data Models

### 8.1 Office model

Suggested fields:

- `name`: display name.
- `slug`: unique room identifier.
- `width`, `height`: virtual world dimensions.
- `layout`: optional JSON describing walls, furniture, and regions.
- `createdAt`, `updatedAt`.

### 8.2 Obstacle model

Suggested fields:

- `officeId`: reference to office.
- `name`: obstacle label.
- `x`, `y`, `width`, `height`: canvas rectangle.
- `blocksSound`: whether the obstacle attenuates audio.
- `geometry`: optional GeoJSON geometry if a geospatial-query demonstration is required.

### 8.3 Live participant state

Keep transient state in memory on the server:

```js
{
  socketId: "socket-id",
  userId: "optional-authenticated-user-id",
  displayName: "Ajith",
  officeId: "main-office",
  x: 240,
  y: 180,
  muted: false,
  lastSeen: 1720000000000
}
```

Do not persist microphone audio or record conversations. Avoid storing unnecessary personal data.

---

## 9. MongoDB Geospatial Design

### 9.1 GeoJSON Rules

MongoDB `2dsphere` indexes expect valid GeoJSON longitude/latitude coordinates. For a virtual office, define a conversion layer that maps the office's local X/Y plane into a bounded synthetic coordinate range. Document the conversion and never describe it as a real physical location.

### 9.2 Example geospatial schema

```js
const mongoose = require("mongoose");

const ParticipantLocationSchema = new mongoose.Schema({
  socketId: { type: String, required: true, index: true },
  officeId: { type: String, required: true, index: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  updatedAt: { type: Date, default: Date.now }
});

ParticipantLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model(
  "ParticipantLocation",
  ParticipantLocationSchema
);
```

### 9.3 Query example

```js
const nearby = await ParticipantLocation.find({
  officeId,
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      $maxDistance: radiusInMeters
    }
  }
}).limit(100);
```

**Important:** `$maxDistance` for a GeoJSON `2dsphere` query is measured in meters, not canvas pixels. Convert your virtual distance into a documented simulated distance, or use a 2D planar strategy for canvas pixels. Filter by `officeId` and exclude the requesting user. Create and test the index before running geospatial queries.

### 9.4 Practical proximity strategy

For the main real-time loop, calculate Euclidean distance in canvas coordinates:

```js
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
```

For 50+ users, an all-pairs calculation is manageable as a starting point, but profile it. If load increases, use a uniform spatial grid or spatial index to limit comparisons to nearby cells.

---

## 10. Socket.IO Event Contract

Keep event names consistent across client and server.

| Event | Direction | Purpose |
|---|---|---|
| `office:join` | client → server | Request to join an office |
| `office:joined` | server → client | Initial participant list and self ID |
| `participant:move` | client → server | Proposed avatar coordinates |
| `participant:moved` | server → room | Validated position broadcast |
| `participants:snapshot` | server → client | Current office participant list |
| `proximity:update` | server → client | List of nearby peer IDs |
| `webrtc:offer` | peer → server → peer | Forward SDP offer |
| `webrtc:answer` | peer → server → peer | Forward SDP answer |
| `webrtc:ice-candidate` | peer → server → peer | Forward ICE candidate |
| `participant:mute` | client → server | Mute state update |
| `office:leave` | client → server | Leave office |
| `server:error` | server → client | Safe, user-readable error |
| `participant:left` | server → room | Participant disconnected |

### Rules

- Validate all payloads and cap coordinate values to the world bounds.
- Derive sender identity from the socket, not a client-supplied ID.
- Only forward WebRTC signaling to peers in the same office and allowed proximity group.
- Rate-limit movement messages and coalesce updates.
- Avoid broadcasting every animation frame; send movement updates at a controlled rate (for example, 10–20 times per second).
- Clean up room state on disconnect.
- Never trust client-provided proximity lists.

---

## 11. Movement and Virtual World

### 11.1 Canvas rendering

- Use a responsive canvas that scales with the container.
- Use `requestAnimationFrame` for rendering.
- Separate world coordinates from screen coordinates.
- Draw floors, walls, desks, meeting areas, obstacles, participant avatars, and names.
- Support resizing using `ResizeObserver` or window resize events.
- Keep rendering separate from network updates.

### 11.2 Movement

Suggested controls:

- `W`, `A`, `S`, `D` or arrow keys.
- Optional click-to-move.
- Normalize diagonal movement so diagonal travel is not faster.
- Clamp coordinates to world boundaries.
- Do not allow movement through walls if collision detection is implemented.
- Show a visible local avatar and remote avatars.
- Ensure keyboard controls do not intercept typing in input fields.

### 11.3 Collision logic

For rectangular obstacles, check the candidate avatar position against each obstacle rectangle. If collision occurs, reject or slide along the blocked axis. Use the same authoritative rules on the server if collision affects gameplay integrity.

---

## 12. WebRTC Audio Architecture

### 12.1 Connection lifecycle

1. User joins and grants microphone permission.
2. Client requests microphone audio using `getUserMedia`.
3. Client creates an `RTCPeerConnection` for each nearby peer in the MVP mesh design.
4. The initiating peer creates an offer and sends it through Socket.IO.
5. The receiver sets the remote description, creates an answer, and sends it back.
6. Both sides exchange ICE candidates.
7. Once connected, the remote audio track is routed through Web Audio nodes.
8. If peers move outside the configured radius, reduce volume or close the peer connection according to the chosen hysteresis policy.
9. On mute, disable the local audio track; on leave, close peer connections and stop microphone tracks.

### 12.2 Signaling is not audio transport

Socket.IO carries only signaling messages (SDP offers/answers and ICE candidates). WebRTC carries the real-time audio media.

### 12.3 STUN and TURN

- Configure a STUN server for ICE candidate discovery.
- A TURN server is often required when direct peer-to-peer connectivity fails due to NAT/firewall restrictions.
- Use a trusted TURN service or a properly configured coturn deployment for real testing.
- Do not hard-code long-lived TURN credentials in public client code. Use time-limited credentials where possible.
- Test across separate networks, not only two tabs on one computer.

### 12.4 Mesh scaling caveat

A full mesh creates up to `n × (n − 1) / 2` peer connections for `n` participants if every user connects to every other user. Proximity filtering reduces this, but dense clusters can still be expensive. For the initial 50+ user target, enforce nearby-only connections, cap the number of simultaneous audio peers, and profile CPU/network use. If the product needs large dense groups, consider an SFU such as mediasoup or LiveKit instead of a full mesh.

### 12.5 Audio controls

- Microphone permission/status.
- Mute/unmute.
- Master output volume.
- Optional push-to-talk.
- Connection status.
- Clear indicator when the microphone is active.
- A “Start audio” button may be needed because browsers often require a user gesture before audio playback.

---

## 13. Spatial Audio (Web Audio API)

### 13.1 Recommended graph

```text
Remote MediaStream
       │
MediaStreamAudioSourceNode
       │
GainNode (distance attenuation)
       │
StereoPannerNode (left/right positioning)
       │
AudioContext.destination
```

Use `StereoPannerNode` for left/right stereo positioning. The standard `StereoPannerNode` is not full 3D positional audio; if true 3D positioning is required, evaluate `PannerNode`.

### 13.2 Distance-based volume

Let `d` be the distance between avatars and `R` the audible radius.

A simple linear attenuation model:

```js
function volumeForDistance(distance, radius) {
  if (distance >= radius) return 0;
  return Math.max(0, 1 - distance / radius);
}
```

A smoother model can be used to avoid abrupt changes. Smooth the gain with `gainNode.gain.setTargetAtTime(...)` rather than assigning values abruptly.

### 13.3 Stereo panning

Normalize the horizontal relative position:

```js
function panForRelativeX(relativeX, radius) {
  if (radius <= 0) return 0;
  return Math.max(-1, Math.min(1, relativeX / radius));
}
```

- `-1`: fully left.
- `0`: centered.
- `1`: fully right.

Test with headphones at multiple avatar positions. Always provide a master volume control.

### 13.4 Audio occlusion by obstacles

For the first version, obstacles may be persisted but need not block sound. In the next iteration, use line-segment/rectangle intersection to detect whether a wall lies between two avatars, then apply additional attenuation. Clearly distinguish implemented occlusion from future work.

---

## 14. Proximity Engine

### 14.1 Initial algorithm

For each participant, find participants in the same office and calculate distance. Mark peers as nearby when `distance <= PROXIMITY_RADIUS`.

```js
function getNearbyParticipants(current, participants, radius) {
  return participants.filter((other) => {
    if (other.socketId === current.socketId) return false;
    if (other.officeId !== current.officeId) return false;
    return Math.hypot(other.x - current.x, other.y - current.y) <= radius;
  });
}
```

### 14.2 Avoid connection flapping

Use hysteresis:

- Start audio when distance is below `JOIN_RADIUS` (e.g. 100 px).
- Keep the connection until distance exceeds a larger `LEAVE_RADIUS` (e.g. 120 px).
- Add a short debounce before disconnecting.
- Fade volume to zero before closing a connection.

This prevents repeated connect/disconnect events when users stand at the boundary.

### 14.3 Update cadence

- Render locally at the browser's animation rate.
- Send movement to the server at a controlled frequency.
- Calculate proximity when positions change or on a short server interval.
- Send only changes to the nearby-peer set where possible.
- Instrument computation time and peer count.

---

## 15. API and Server Responsibilities

### REST endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness and dependency status |
| `GET` | `/api/offices` | List available offices |
| `GET` | `/api/offices/:slug` | Retrieve office layout |
| `POST` | `/api/offices` | Create an office (admin-protected if enabled) |
| `PUT` | `/api/offices/:slug/layout` | Update layout (admin-protected) |

### Server responsibilities

- Validate and normalize incoming data.
- Maintain authoritative live participant state.
- Manage Socket.IO rooms.
- Compute proximity and notify clients.
- Relay WebRTC signaling safely.
- Persist office layouts and obstacles.
- Clean up on disconnect.
- Log errors without logging private audio or secrets.

---

## 16. Security, Privacy, and Accessibility

- Use HTTPS/WSS in deployment; microphone capture requires a secure context except localhost.
- Request microphone permission only after a clear user action.
- Show when the microphone is active.
- Provide a mute button and master volume control.
- Do not record audio by default.
- Validate and rate-limit socket events.
- Restrict signaling to peers in the same office and eligible proximity group.
- Use authentication and role checks before public deployment.
- Store secrets in environment variables and deployment secret managers.
- Configure CORS for the expected frontend origin instead of allowing every origin in production.
- Add keyboard focus styles, accessible labels, and sufficient color contrast.
- Explain that browser/device behavior and network conditions affect audio quality.

---

## 17. Week-wise Development Plan

The following plan follows the internship brief. The mid-project review is a milestone, not an additional numbered week.

### Week 1 — Signaling, movement, and world rendering

**Backend**
- Initialize Express and Socket.IO.
- Define office/participant state.
- Implement join/leave and movement broadcasts.
- Validate X/Y coordinates and room membership.
- Define MongoDB schemas and geospatial index strategy.

**Frontend**
- Create the React app and virtual office canvas.
- Draw the map and avatars.
- Add keyboard/mouse movement.
- Broadcast movement and render other participants.

**Acceptance criteria**
- Two separate browser sessions can join the same office.
- Each sees the other's avatar move smoothly.
- Invalid coordinates are rejected.
- Disconnect removes the avatar from the room.

### Week 2 — Proximity and WebRTC

**Backend**
- Implement the proximity engine.
- Add MongoDB `$near`/`$geoWithin` demonstration or document the hybrid spatial strategy.
- Notify clients when peers enter/leave proximity.
- Relay WebRTC offers, answers, and ICE candidates.

**Frontend**
- Request microphone permission.
- Establish WebRTC audio with nearby peers.
- Add mute/unmute and connection status.
- Handle denied permissions and failed connections.

**Acceptance criteria**
- Two browsers can exchange audio over WebRTC.
- Peers outside the configured radius do not initiate new audio sessions.
- The microphone can be muted immediately.
- Connection state is visible.

### Mid-project review

Demonstrate:
- Real-time avatar movement.
- Correct proximity filtering.
- Two-browser WebRTC connection.
- Logs or metrics for spatial-query duration.
- Known limitations and the plan for scaling.

### Week 3 — Dynamic audio and scaling

**Backend**
- Reduce redundant proximity broadcasts.
- Profile spatial computation.
- Add Redis Pub/Sub / Socket.IO Redis adapter if multiple instances are available.
- Add peer caps and backpressure handling.

**Frontend**
- Route remote tracks through Web Audio API.
- Implement smooth distance-based gain.
- Add stereo panning.
- Test audio as users move around each other.

**Acceptance criteria**
- Audio fades as peers move away and becomes louder as they approach.
- Stereo panning responds to horizontal relative position.
- Movement and audio remain stable with a representative multi-user test.
- Performance metrics are recorded.

### Week 4 — Persistence, polish, and final review

**Backend**
- Persist office layouts and furniture/wall obstacles.
- Add health checks and safe error handling.
- Verify cleanup after disconnects.
- Document deployment configuration.

**Frontend**
- Refine map visuals and animations.
- Add sound-blocking obstacle attenuation if time permits.
- Add responsive UI, accessibility, and clear connection states.
- Test browser permission and network failure cases.

**Acceptance criteria**
- Office layout reloads from MongoDB.
- Main flows work on supported desktop browsers.
- Errors are understandable and do not crash the app.
- README, test plan, architecture diagram, and demo script are ready.

---

## 18. Testing Plan

### Unit tests
- Distance calculation.
- Proximity radius and hysteresis.
- Coordinate bounds and payload validation.
- Gain calculation and stereo-pan calculation.
- Collision detection.
- Join/leave state cleanup.

### Integration tests
- Socket.IO join, movement, and disconnect.
- Office membership isolation.
- Signaling relay only to eligible peers.
- MongoDB office layout create/read/update.
- Nearby-peer updates after movement.

### Browser tests
- Join an office with two browser contexts.
- Move avatars toward and away from each other.
- Grant and deny microphone permission.
- Mute and unmute.
- Verify audio connection state and cleanup.
- Resize the window and check canvas scaling.

### Load and performance tests
- Simulate at least 50 participants for movement/state handling.
- Measure server CPU, memory, message rate, proximity duration, and event-loop lag.
- Measure frontend frame rate on target hardware.
- Test dense clusters, rapid movement, reconnects, and one participant disconnecting unexpectedly.
- Distinguish a simulated load test from 50 actual live microphone connections.

### Manual test checklist

- [ ] Join with valid name.
- [ ] Reject empty/oversized names.
- [ ] Join the correct office.
- [ ] See all current participants.
- [ ] Move with WASD and arrow keys.
- [ ] Stay within map bounds.
- [ ] Hear nearby peer after permission is granted.
- [ ] Hear audio attenuate with distance.
- [ ] Hear left/right panning with headphones.
- [ ] Mute and unmute.
- [ ] Handle microphone denial.
- [ ] Leave office.
- [ ] Recover from peer disconnect.
- [ ] Reload office layout.
- [ ] Verify a user in another office cannot receive signaling.
- [ ] Check production HTTPS and TURN configuration.

---

## 19. Common Risks and Mitigations

| Risk | Mitigation |
|---|---|
| WebRTC fails across networks | Configure TURN and test on separate networks |
| Too many peer connections | Nearby-only mesh, peer cap, or move to an SFU |
| MongoDB queries slow down movement | Keep live state in memory and use a spatial index; use MongoDB for persistence/geospatial demonstration |
| Audio cuts at radius boundary | Hysteresis and gain smoothing |
| Browser blocks autoplay | Start audio from a user gesture |
| Microphone permission denied | Explain the issue and allow retry |
| Movement messages overload server | Rate-limit, coalesce, and validate updates |
| Canvas blurry on high-DPI displays | Scale backing resolution by `devicePixelRatio` |
| Redis added too early | Complete a stable single-instance MVP first |
| “50+ users” claim unverified | Benchmark and report measured results honestly |

---

## 20. Deployment Plan

### Development

- Client: Vite dev server.
- Server: Node.js + Express + Socket.IO.
- Database: local MongoDB or MongoDB Atlas.
- Use localhost for microphone development testing.

### Production

- Deploy frontend and backend to platforms that support WebSocket connections.
- Configure HTTPS and WSS.
- Set exact `CLIENT_ORIGIN`.
- Configure MongoDB Atlas network access securely.
- Configure STUN/TURN for real-world WebRTC connectivity.
- Add health monitoring and logs.
- If using multiple server instances, configure sticky-session requirements as appropriate and the Socket.IO Redis adapter.
- Verify that the hosting platform does not sleep or terminate long-running WebSocket connections under expected load.

### Pre-deployment checklist

- [ ] `.env` is not committed.
- [ ] CORS origin is correct.
- [ ] HTTPS is enabled.
- [ ] MongoDB index exists.
- [ ] TURN credentials are secure and short-lived where possible.
- [ ] Socket.IO events are validated and rate-limited.
- [ ] Disconnect cleanup works.
- [ ] Production build works.
- [ ] Browser and network tests are documented.

---

## 21. Git Workflow

Initialize Git:

```bash
git init
git add .
git commit -m "Initial ProxiSpeak project structure"
```

Recommended incremental commits:

```text
feat: initialize React and Express apps
feat: add virtual office canvas
feat: implement Socket.IO movement
feat: add proximity engine
feat: add WebRTC signaling and audio
feat: implement spatial audio
feat: persist office layout
test: add movement and proximity tests
docs: add setup and demo instructions
```

Suggested `.gitignore`:

```gitignore
node_modules/
dist/
build/
.env
.env.*
!.env.example
coverage/
.DS_Store
.vscode/
```

---

## 22. README Content Checklist

The root README should include:

1. Project title and problem statement.
2. Screenshots or a short demo video.
3. Features.
4. Architecture diagram.
5. Tech stack.
6. Prerequisites.
7. Installation instructions for client and server.
8. Environment variable setup.
9. How to run both processes.
10. How to test using two browser sessions.
11. WebRTC/STUN/TURN notes.
12. MongoDB geospatial design explanation.
13. Known limitations.
14. Test results and measured performance.
15. Contributors and internship context, if approved by the organization.

---

## 23. Demo Script for Internship Review

1. Start MongoDB and the backend.
2. Start the React frontend.
3. Open two separate browser sessions.
4. Join the same office with different display names.
5. Show avatars moving in real time.
6. Move avatars close together and demonstrate audio.
7. Move one avatar away and demonstrate volume attenuation.
8. Move one avatar left/right and demonstrate stereo panning.
9. Mute/unmute one participant.
10. Show a participant leaving and the state cleaning up.
11. Show office layout persistence after a reload.
12. Show measured performance results and explain limitations honestly.

---

## 24. Definition of Done

The MVP is complete when:

- [ ] A user can join and leave an office.
- [ ] Multiple clients see synchronized avatar positions.
- [ ] The server validates movement and calculates proximity.
- [ ] WebRTC audio works for nearby peers in tested network conditions.
- [ ] Audio volume changes smoothly with distance.
- [ ] Stereo panning follows relative horizontal position.
- [ ] Mute/unmute and master volume work.
- [ ] Office layout persists in MongoDB.
- [ ] Errors, permission denial, and disconnects are handled.
- [ ] Automated and manual test results are documented.
- [ ] The project can be installed from a clean checkout using the README.

---

## 25. Final Implementation Advice

Build the project in small, testable milestones. First prove movement between two browsers; then prove signaling; then establish audio; then add spatial mixing; finally add persistence, scaling, and polish. Do not start Redis or optimize for 50 live audio participants before the basic end-to-end flow works.

**Important for internship delivery:** This file is the complete project blueprint, not a claim that the code has already been implemented or benchmarked. Update the acceptance criteria with actual screenshots, test output, and measured results as each week is completed.
