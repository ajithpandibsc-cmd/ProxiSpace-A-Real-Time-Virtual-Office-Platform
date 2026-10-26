# ProxiSpeak — API and Socket.IO Event Specification

## 1. REST API Endpoints

Base URL: `http://localhost:4000/api`

### 1.1 Health & Telemetry
- **Endpoint**: `GET /api/health`
- **Description**: Returns server liveness, active connection metrics, and database state.
- **Response**:
```json
{
  "status": "ok",
  "service": "ProxiSpeak Real-Time Geospatial Audio Server",
  "time": "2026-10-23T05:43:52.368Z",
  "uptimeSeconds": 240,
  "database": {
    "type": "MongoDB + In-Memory Fallback",
    "connected": false,
    "mode": "in-memory-resilient"
  },
  "metrics": {
    "activeParticipants": 2,
    "activeOffices": 1
  }
}
```

### 1.2 Office Directory
- **Endpoint**: `GET /api/offices`
- **Description**: Lists all available office spaces with dimensions and architectural zones.
- **Response**:
```json
[
  {
    "name": "Main Virtual HQ",
    "slug": "main",
    "width": 1200,
    "height": 800,
    "layout": {
      "theme": "modern-tech",
      "zones": [
        { "id": "engineering", "name": "Engineering Pod", "x": 60, "y": 60, "width": 440, "height": 320 }
      ]
    }
  }
]
```

### 1.3 Office Layout & Obstacles
- **Endpoint**: `GET /api/offices/:slug`
- **Description**: Returns detailed layout and obstacle definitions for an office.
- **Response**:
```json
{
  "name": "Main Virtual HQ",
  "slug": "main",
  "width": 1200,
  "height": 800,
  "layout": { "theme": "modern-tech", "zones": [...] },
  "obstacles": [
    {
      "id": "desk-1",
      "name": "Workstation Alpha",
      "x": 100,
      "y": 120,
      "width": 140,
      "height": 70,
      "type": "desk",
      "blocksSound": false
    },
    {
      "id": "wall-boardroom-left",
      "name": "Boardroom Acoustic Wall",
      "x": 535,
      "y": 60,
      "width": 10,
      "height": 260,
      "type": "wall",
      "blocksSound": true
    }
  ]
}
```

### 1.4 Geospatial Demo & Latency Benchmark
- **Endpoint**: `GET /api/spatial-demo?x=450&y=300&radius=120`
- **Description**: Demonstrates synthetic 2D canvas to GeoJSON `2dsphere` mapping and reports sub-millisecond computation duration.
- **Response**:
```json
{
  "description": "Demonstration of ProxiSpeak 2D Canvas to GeoJSON 2dsphere mapping",
  "input": { "canvasX": 450, "canvasY": 300, "radiusPixels": 120 },
  "geoJSON": { "type": "Point", "coordinates": [-0.0025, -0.0015] },
  "reconvertedCanvas": { "x": 450, "y": 300 },
  "mongoQueryExample": {
    "filter": {
      "location": {
        "$near": {
          "$geometry": { "type": "Point", "coordinates": "-0.0025 -0.0015" },
          "$maxDistance": 180
        }
      }
    },
    "index": { "location": "2dsphere" }
  },
  "latencyBenchmark": {
    "durationMicroseconds": 262.5,
    "spatialFilteringTarget": "< 20ms",
    "status": "OPTIMAL (sub-millisecond in-memory filtering)"
  }
}
```

---

## 2. Socket.IO Event Contract

| Event | Direction | Payload | Description |
|---|---|---|---|
| `office:join` | Client ➔ Server | `{ displayName: string, officeId: string, color?: string }` | Requests entrance into an office space |
| `office:joined` | Server ➔ Client | `{ selfId, participants, worldWidth, worldHeight, office }` | Confirms entrance and sends initial room state |
| `participant:joined` | Server ➔ Room | `{ socketId, displayName, x, y, muted }` | Broadcast to office peers when a new avatar arrives |
| `participant:move` | Client ➔ Server | `{ x: number, y: number }` | Rate-limited proposed coordinates from local client |
| `participant:moved` | Server ➔ Room | `{ socketId, x, y }` | Authoritative coordinate broadcast |
| `proximity:update` | Server ➔ Client | `{ nearby: Array<{ socketId, x, y, displayName, muted }> }` | List of peers inside current audible range |
| `participant:mute` | Client ➔ Server | `{ muted: boolean }` | Toggles participant microphone state |
| `participant:muted` | Server ➔ Room | `{ socketId, muted: boolean }` | Notifies peers of changed mute state |
| `participant:reaction` | Client ➔ Server ➔ Room | `{ socketId, emoji: string }` | Broadcasts floating emoji reaction bubble |
| `webrtc:offer` | Client ➔ Server ➔ Peer | `{ to: string, from?: string, offer: RTCSessionDescriptionInit }` | Relays WebRTC SDP offer |
| `webrtc:answer` | Client ➔ Server ➔ Peer | `{ to: string, from?: string, answer: RTCSessionDescriptionInit }` | Relays WebRTC SDP answer |
| `webrtc:ice-candidate` | Client ➔ Server ➔ Peer | `{ to: string, from?: string, candidate: RTCIceCandidateInit }` | Relays ICE network candidates |
| `office:leave` | Client ➔ Server | *none* | Explicitly leaves the office space |
| `participant:left` | Server ➔ Room | `{ socketId: string }` | Broadcast when a peer disconnects or leaves |
| `server:error` | Server ➔ Client | `{ message: string }` | Emits safe, user-facing error message |
