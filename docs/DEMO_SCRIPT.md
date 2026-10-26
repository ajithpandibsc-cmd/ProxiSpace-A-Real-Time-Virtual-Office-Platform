# ProxiSpeak — Internship Presentation & Review Demo Script

This step-by-step walkthrough script is structured for demonstrating ProxiSpeak to stakeholders, technical evaluators, and the Infotact internship review board.

---

## 1. Setup & Environment Verification (1 Minute)

1. Verify backend server is running:
   ```bash
   curl http://localhost:4000/api/health
   ```
   *Point out:* Fast health check returning database status, active offices, and zero-error uptime.

2. Verify frontend Vite server:
   Navigate to `http://localhost:5173`.

---

## 2. Multi-Session Join Walkthrough (2 Minutes)

1. **Session 1 (Browser Tab A / Window 1)**:
   - Name: `Ajith`
   - Office: `Main Virtual HQ`
   - Color: Pick `Indigo`
   - Click **"Enter Office Space →"**
   - Click **"🎤 Enable Microphone"** and allow browser audio permissions.

2. **Session 2 (Incognito / Window 2)**:
   - Name: `Priya`
   - Office: `Main Virtual HQ`
   - Color: Pick `Emerald`
   - Click **"Enter Office Space →"**
   - Click **"🎤 Enable Microphone"**

*Notice:* Both avatars immediately appear on both screens in real time. The sidebar reflects both participants in the "In Office (2)" list.

---

## 3. Movement & Collision Demonstration (2 Minutes)

1. **Keyboard Movement**:
   - Use `W`, `A`, `S`, `D` or Arrow keys to move avatar.
   - Walk into a workstation desk: show that the avatar stops at the desk edge and slides smoothly along it.
2. **Click-to-Move**:
   - Click anywhere across the virtual room (e.g., towards the "Glass Boardroom").
   - Observe the pulsating ripple marker and smooth avatar navigation.
3. **Boundary Clamping**:
   - Walk towards the outer boundary; verify the avatar cannot leave world dimensions.

---

## 4. Proximity Spatial Audio & Directional Panning (3 Minutes)

1. **Distance-Based Volume**:
   - Move `Ajith` away from `Priya` (> 150 px).
   - Audio fades out smoothly to silence (no abrupt clicking).
   - Walk `Ajith` closer to `Priya` (< 150 px).
   - A subtle welcome chime plays, and speech volume rises naturally.
2. **Directional Stereo Panning**:
   - Walk `Ajith` to the left of `Priya`: speech pans into the left ear.
   - Walk `Ajith` to the right of `Priya`: speech pans into the right ear.
3. **Acoustic Wall Occlusion**:
   - Walk `Ajith` inside the "Glass Boardroom" behind the red acoustic partition wall.
   - Observe the 65% acoustic attenuation factor ($0.35\times$ gain), providing natural meeting room privacy!

---

## 5. Collaboration & Controls (2 Minutes)

1. **Reactions**:
   - Click `👋` or `☕` on the HUD bar.
   - Show the floating animated emoji reaction bubble above the avatar.
2. **Microphone Mute & Live VU Meter**:
   - Speak into the microphone: demonstrate the green VU audio level meter responding to real-time voice amplitude.
   - Click **"🎙️ Mute Microphone"**: show the badge changing to `🔇 Muted` on both user screens.
3. **Master Volume**:
   - Adjust the master volume slider in the sidebar.

---

## 6. Geospatial Query & Performance Telemetry (1 Minute)

1. Open a browser tab to:
   `http://localhost:4000/api/spatial-demo?x=500&y=300&radius=150`
2. Explain the architectural design choice:
   - 2D Canvas coordinate mapping to synthetic GeoJSON `Point` coordinates for MongoDB `2dsphere` queries.
   - Demonstrates sub-millisecond proximity lookup latency ($< 1\text{ ms}$, exceeding the $< 20\text{ ms}$ brief requirement).

---

## 7. Clean Disconnect & Teardown

1. Click **"Leave Office"** in Tab 1.
2. Tab 2 immediately updates: avatar vanishes from canvas and participant list cleans up with zero orphan peer connections.
