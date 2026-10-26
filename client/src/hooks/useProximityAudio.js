import { useRef, useCallback, useEffect } from "react";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const JOIN_RADIUS = 150;
const LEAVE_RADIUS = 185;

/**
 * Line segment intersection check for acoustic walls
 */
function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (det === 0) return false;
  const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  return 0 <= lambda && lambda <= 1 && 0 <= gamma && gamma <= 1;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;

  if (
    (x1 >= rect.x && x1 <= rx2 && y1 >= rect.y && y1 <= ry2) ||
    (x2 >= rect.x && x2 <= rx2 && y2 >= rect.y && y2 <= ry2)
  ) {
    return true;
  }

  return (
    linesIntersect(x1, y1, x2, y2, rect.x, rect.y, rx2, rect.y) ||
    linesIntersect(x1, y1, x2, y2, rx2, rect.y, rx2, ry2) ||
    linesIntersect(x1, y1, x2, y2, rx2, ry2, rect.x, ry2) ||
    linesIntersect(x1, y1, x2, y2, rect.x, ry2, rect.x, rect.y)
  );
}

function computeAcousticOcclusion(posA, posB, obstacles = []) {
  if (!obstacles || obstacles.length === 0) return 1.0;
  let factor = 1.0;
  for (const obs of obstacles) {
    if (obs.blocksSound && segmentIntersectsRect(posA.x, posA.y, posB.x, posB.y, obs)) {
      factor *= 0.35; // 65% attenuation per sound-blocking wall
    }
  }
  return factor;
}

/**
 * Manages WebRTC peer connections, spatial audio, acoustic wall occlusion,
 * and master volume control for the virtual office.
 */
export function useProximityAudio({ socketRef, micStreamRef, selfId, obstacles = [], masterVolume = 0.8 }) {
  const peersRef = useRef(new Map());
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const activePeerIds = useRef(new Set());
  const pendingDebounce = useRef(new Map());
  const obstaclesRef = useRef(obstacles);
  const masterVolRef = useRef(masterVolume);

  obstaclesRef.current = obstacles;
  masterVolRef.current = masterVolume;

  // Update master gain whenever masterVolume prop changes
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        masterVolume,
        audioCtxRef.current.currentTime,
        0.05
      );
    }
  }, [masterVolume]);

  // Lazy-create AudioContext after user gesture
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const masterGain = ctx.createGain();
      masterGain.gain.value = masterVolRef.current;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;
      audioCtxRef.current = ctx;
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Subtle synthesized audio chime when peer enters proximity
  const playProximityChime = useCallback((pitch = 520) => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(masterGainRef.current || ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }, [getAudioCtx]);

  const createPeer = useCallback(
    async (peerId, polite) => {
      if (peersRef.current.has(peerId)) return;

      const audioCtx = getAudioCtx();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      const pannerNode = audioCtx.createStereoPanner();
      pannerNode.pan.value = 0;

      // Connect: remote audio -> gainNode -> pannerNode -> masterGain -> destination
      gainNode.connect(pannerNode);
      pannerNode.connect(masterGainRef.current || audioCtx.destination);

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

      // Add local audio tracks if mic is active
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, micStreamRef.current);
        });
      }

      // Receive remote audio
      pc.ontrack = (e) => {
        const mediaStream = e.streams[0];
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(gainNode);
      };

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit("webrtc:ice-candidate", { to: peerId, candidate: e.candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
        }
      };

      peersRef.current.set(peerId, { pc, gainNode, pannerNode });
      activePeerIds.current.add(peerId);
      playProximityChime(520); // chime on join

      // Polite peer creates offer
      if (!polite) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("webrtc:offer", { to: peerId, offer });
        } catch (err) {
          console.error("Offer creation failed", err);
        }
      }
    },
    [getAudioCtx, micStreamRef, socketRef, playProximityChime]
  );

  const closePeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;
    try {
      peer.gainNode.gain.setTargetAtTime(0, peer.gainNode.context.currentTime, 0.2);
      setTimeout(() => {
        try {
          peer.gainNode.disconnect();
          peer.pannerNode.disconnect();
          peer.pc.close();
        } catch (_) {}
      }, 500);
    } catch (_) {}
    peersRef.current.delete(peerId);
    activePeerIds.current.delete(peerId);
  }, []);

  // Update audio spatialization & acoustic occlusion
  const updateAudio = useCallback((peerId, selfPos, peerPos) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;

    const dx = peerPos.x - selfPos.x;
    const dy = peerPos.y - selfPos.y;
    const dist = Math.hypot(dx, dy);
    const radius = JOIN_RADIUS;

    // Distance attenuation with smooth cosine falloff
    let vol = dist >= radius ? 0 : Math.max(0, 0.5 * (1 + Math.cos(Math.PI * (dist / radius))));

    // Obstacle acoustic occlusion
    const occlusion = computeAcousticOcclusion(selfPos, peerPos, obstaclesRef.current);
    vol *= occlusion;

    peer.gainNode.gain.setTargetAtTime(vol, peer.gainNode.context.currentTime, 0.1);

    // Stereo panning: -1 (left) to +1 (right)
    const pan = Math.max(-1, Math.min(1, dx / radius));
    peer.pannerNode.pan.setTargetAtTime(pan, peer.pannerNode.context.currentTime, 0.1);
  }, []);

  // Handle WebRTC signaling
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onOffer = async ({ from, offer }) => {
      await createPeer(from, true);
      const peer = peersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription(offer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { to: from, answer });
      } catch (err) {
        console.error("Answer failed", err);
      }
    };

    const onAnswer = async ({ from, answer }) => {
      const peer = peersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription(answer);
      } catch (err) {
        console.error("Set remote description failed", err);
      }
    };

    const onIce = async ({ from, candidate }) => {
      const peer = peersRef.current.get(from);
      if (!peer || !candidate) return;
      try {
        await peer.pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE candidate failed", err);
      }
    };

    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice-candidate", onIce);

    return () => {
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIce);
    };
  }, [socketRef, createPeer]);

  // Handle proximity updates with hysteresis debounce
  const handleProximityUpdate = useCallback(
    async ({ nearby, selfPos }) => {
      const nearbyIds = new Set(nearby.map((p) => p.socketId));

      // Connect to new nearby peers
      for (const peer of nearby) {
        if (!activePeerIds.current.has(peer.socketId)) {
          if (pendingDebounce.current.has(peer.socketId)) {
            clearTimeout(pendingDebounce.current.get(peer.socketId));
            pendingDebounce.current.delete(peer.socketId);
          }
          await createPeer(peer.socketId, false);
        }
        updateAudio(peer.socketId, selfPos, peer);
      }

      // Disconnect from peers who left proximity
      for (const activeId of activePeerIds.current) {
        if (!nearbyIds.has(activeId) && !pendingDebounce.current.has(activeId)) {
          const timer = setTimeout(() => {
            closePeer(activeId);
            pendingDebounce.current.delete(activeId);
          }, 1500);
          pendingDebounce.current.set(activeId, timer);
        }
      }
    },
    [createPeer, closePeer, updateAudio]
  );

  const closeAll = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) {
      closePeer(peerId);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, [closePeer]);

  return { handleProximityUpdate, closeAll, activePeerIds, getAudioCtx };
}
