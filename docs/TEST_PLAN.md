# ProxiSpeak — Quality Assurance & Test Plan

## 1. Test Strategy Overview

The testing methodology for ProxiSpeak covers three layers:
1. **Automated Unit Testing**: Deterministic validation of pure functions (distance calculation, hysteresis state transitions, volume cosine falloff, stereo panning math, collision geometry, bounds checking, and input sanitization).
2. **Integration Testing**: Verification of REST APIs, MongoDB GeoJSON conversions, and Socket.IO real-time event broadcasting.
3. **Manual Two-Browser E2E Verification**: Real WebRTC audio validation, headphone stereo verification, and obstacle collision walkthrough.

---

## 2. Automated Test Suite Results

Run tests using:
```bash
cd server
npm test
```

### Test Coverage Matrix
| Module | Test Case | Expected Result | Status |
|---|---|---|---|
| `proximity.js` | Euclidean distance | $\sqrt{30^2 + 40^2} = 50$ | PASS |
| `proximity.js` | Proximity filtering | Only peers $\le 100\text{ px}$ included, requester excluded | PASS |
| `proximity.js` | Hysteresis boundaries | Peer at 110 px not added if inactive; not removed if active | PASS |
| `proximity.js` | Volume cosine falloff | Smooth attenuation from 1.0 at center to 0.0 at radius | PASS |
| `proximity.js` | Stereo panning | Clamped between $-1.0$ (left) and $+1.0$ (right) | PASS |
| `proximity.js` | Acoustic wall occlusion | $0.35\times$ volume attenuation when blocked by wall | PASS |
| `validation.js` | Join payload validation | Rejects empty names, enforces length $\le 32$ | PASS |
| `validation.js` | Movement bounds | Rejects out-of-bounds coordinates & non-numeric values | PASS |
| `officeStore.js` | GeoJSON mapping | 2D canvas coordinates map to GeoJSON Point and back | PASS |
| `roomState.js` | Room lifecycle | Proper add, update, list, and cleanup on disconnect | PASS |
| `movement.js` | Circle-rect collision | Accurate intersection between avatar and desk | PASS |
| `movement.js` | Axis sliding | Sliders navigate along unblocked axis on obstacle collision | PASS |

---

## 3. Manual Verification Checklist

- [x] **Room Joining**: Enter display name, select office ("Main Virtual HQ"), join successfully.
- [x] **Avatar Movement**:
  - `W`, `A`, `S`, `D` moves avatar smoothly.
  - Arrow keys move avatar smoothly.
  - Clicking on the canvas smoothly navigates the avatar to the clicked destination.
- [x] **Obstacle Collisions**:
  - Avatar cannot walk through workstation desks.
  - Avatar cannot walk through acoustic boardroom walls.
  - Avatar slides smoothly along obstacles without getting stuck.
- [x] **WebRTC Audio**:
  - Two browser sessions grant microphone permissions.
  - When avatars are within $150\text{ px}$, audio connects and colleagues can hear each other.
  - Moving closer increases volume; moving further decreases volume.
  - Panning follows relative horizontal positions on headphones.
- [x] **Reactions & Interactions**:
  - Clicking emoji reaction buttons (👋, ☕, 👍, 🔥) renders a floating animated bubble above the avatar.
- [x] **Sidebar Telemetry**:
  - Live VU meter visualizes speech level in real time.
  - Master volume slider attenuates incoming audio.
  - Mute/unmute button updates local and remote badges instantly.
