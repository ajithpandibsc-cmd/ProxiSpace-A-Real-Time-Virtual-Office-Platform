# ProxiSpeak — System Architecture & Technical Blueprint

## 1. System Overview

**ProxiSpeak** is a geospatial proximity audio ecosystem designed for virtual remote collaboration. It provides a 2D spatial office where colleagues can navigate avatars, see each other's live positions, and engage in spontaneous peer-to-peer audio conversations that attenuate naturally with distance and direction.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Web Client                              │
│                                                                        │
│  UI (Sidebar / HUD / Join) ── HTML5 Canvas World (60 FPS Render Loop)  │
│         │                                    │                         │
│         ├── Web Audio API                    ├── Input System          │
│         │   ├── AnalyserNode (Live VU)       │   ├── Keyboard (WASD)   │
│         │   ├── GainNode (Cosine Falloff)    │   └── Click-to-Move     │
│         │   ├── StereoPannerNode (-1..+1)    │                         │
│         │   └── Master Gain Control          └── Obstacle Collisions   │
│         │                                                              │
│         └── WebRTC P2P Audio Mesh (RTCPeerConnection + STUN/TURN)      │
│                     │                                                  │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ WebSockets / WSS
┌─────────────────────▼──────────────────────────────────────────────────┐
│                   Node.js Express + Socket.IO Server                   │
│                                                                        │
│  Socket Gateway ── Rate Limiting (50ms) ── Payload Validation          │
│         │                                                              │
│         ├── Proximity Calculation Engine                               │
│         │   ├── Euclidean Distance in Canvas Coordinates               │
│         │   ├── Hysteresis (Join: 150px, Leave: 185px)                 │
│         │   └── Line-of-Sight Acoustic Wall Occlusion                  │
│         │                                                              │
│         ├── WebRTC Signaling Relay (SDP Offers, Answers, ICE)          │
│         │                                                              │
│         └── In-Memory State Manager (Active Rooms & Participants)      │
│                     │                                                  │
│         ┌───────────┴──────────────────────────────┐                   │
│         │ Hybrid Storage & Geospatial Layer        │                   │
│         │  - MongoDB (2dsphere $near & $geoWithin) │                   │
│         │  - Resilient In-Memory Fallback          │                   │
│         └──────────────────────────────────────────┘                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend (React + HTML5 Canvas)
- **World Rendering**: Driven by `requestAnimationFrame`, rendering at 60 FPS on high-DPI retina screens via `devicePixelRatio` scaling.
- **Collision & Movement System**: Circle-to-rectangle intersection testing against architectural obstacles (desks, conference tables, walls), featuring automatic sliding along unobstructed axes.
- **Input System**: Multi-key accumulator for continuous, diagonal-normalized movement (`W`, `A`, `S`, `D` and arrow keys) alongside vector-based **click-to-move** target interpolation.
- **Web Audio Spatial Graph**:
  ```
  Remote Stream ──► MediaStreamSource ──► GainNode (Distance & Occlusion) ──► StereoPannerNode ──► MasterGain ──► AudioDestination
  ```
- **Real-Time Level Metering**: Mic stream is piped into an `AnalyserNode` with FFT analysis to calculate real-time speech amplitude for the sidebar VU meter.

### 2.2 Backend (Node.js, Express & Socket.IO)
- **Authoritative Movement**: Validates all client coordinates within `[0, worldWidth]` and `[0, worldHeight]`. Movement packets are throttled to ~20 Hz to optimize network bandwidth while preserving smoothness.
- **Proximity Engine**: Computes spatial relationships between peers in the same room. Uses **hysteresis** (150 px activation radius, 185 px deactivation radius) to prevent connection flapping at boundaries.
- **Signaling Gateway**: Restricts WebRTC peer signaling to participants currently in proximity within the identical office room, preventing cross-room leakage.
- **Hybrid Storage & GeoJSON Converter**: Translates virtual 2D canvas coordinates into synthetic GeoJSON `2dsphere` points for MongoDB spatial queries (`$near`, `$geoWithin`) while maintaining low-latency sub-millisecond in-memory lookups for active movements.

---

## 3. WebRTC Peer Connection Lifecycle

```
Peer A (Client 1)                    Server (Socket.IO)                   Peer B (Client 2)
     │                                       │                                     │
     │── [Moves into 150px proximity] ──────►│                                     │
     │                                       │── [proximity:update] ──────────────►│
     │◄── [proximity:update] ────────────────│                                     │
     │                                       │                                     │
     │── [webrtc:offer (SDP)] ──────────────►│── [webrtc:offer (SDP)] ────────────►│
     │                                       │                                     │
     │◄── [webrtc:answer (SDP)] ─────────────│◄── [webrtc:answer (SDP)] ───────────│
     │                                       │                                     │
     │── [webrtc:ice-candidate] ────────────►│── [webrtc:ice-candidate] ──────────►│
     │◄── [webrtc:ice-candidate] ────────────│◄── [webrtc:ice-candidate] ──────────│
     │                                       │                                     │
     │═════════════════ Direct WebRTC P2P Audio Established ═══════════════════════│
     │                                                                             │
```

---

## 4. Acoustic Occlusion and Attenuation Math

### 4.1 Distance Attenuation
Volume attenuation follows a smooth cosine falloff curve:
$$V(d, R) = \begin{cases} 0.5 \times \left(1 + \cos\left(\pi \times \frac{d}{R}\right)\right) & \text{if } d < R \\ 0 & \text{if } d \ge R \end{cases}$$
Where:
- $d$ = Euclidean distance $\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
- $R$ = Proximity audio radius ($150\text{ px}$)

### 4.2 Stereo Panning
Stereo positioning is normalized between $-1.0$ (hard left) and $+1.0$ (hard right):
$$P(\Delta x, R) = \max\left(-1.0, \min\left(1.0, \frac{\Delta x}{R}\right)\right)$$

### 4.3 Sound Occlusion
When an avatar line-of-sight segment intersects an obstacle flagged with `blocksSound: true` (e.g., Glass Boardroom Wall, Server Rack Partition), an acoustic dampening factor ($0.35\times$) is compounded, isolating meetings in private rooms.
