import { useEffect, useRef, useCallback, useState } from "react";
import { drawWorld } from "./drawWorld";
import {
  registerKeyListeners,
  computeMovementDelta,
  moveWithCollisions,
  setClickTarget,
  clearClickTarget,
  getClickTarget,
} from "./movement";
import { useProximityAudio } from "../hooks/useProximityAudio";

const SEND_RATE = 50; // ms between server position updates (~20Hz)
const EMOJI_LIST = ["👋", "☕", "👍", "💡", "🔥", "❓", "🎉", "❤️"];

export function VirtualOffice({
  socket,
  selfId,
  participants,
  worldWidth,
  worldHeight,
  officeData = {},
  micStreamRef,
  volume = 0.8,
  onLeave,
}) {
  const canvasRef = useRef(null);
  const selfPosRef = useRef({ x: worldWidth / 2, y: worldHeight / 2 });
  const participantsRef = useRef(participants);
  const animFrameRef = useRef(null);
  const colorMapRef = useRef(new Map());
  const reactionsMapRef = useRef(new Map()); // socketId -> { emoji, timestamp }
  const [nearbyCount, setNearbyCount] = useState(0);

  const obstacles = officeData?.obstacles || [];

  const { handleProximityUpdate, closeAll } = useProximityAudio({
    socketRef: { current: socket },
    micStreamRef,
    selfId,
    obstacles,
    masterVolume: volume,
  });

  // Assign deterministic color indices
  useEffect(() => {
    participants.forEach((p) => {
      if (!colorMapRef.current.has(p.socketId)) {
        colorMapRef.current.set(p.socketId, colorMapRef.current.size);
      }
    });
    participantsRef.current = participants;
  }, [participants]);

  // Handle proximity updates from server
  useEffect(() => {
    if (!socket) return;
    const handler = ({ nearby }) => {
      setNearbyCount(nearby.length);
      handleProximityUpdate({ nearby, selfPos: selfPosRef.current });
    };
    socket.on("proximity:update", handler);
    return () => socket.off("proximity:update", handler);
  }, [socket, handleProximityUpdate]);

  // Handle participant position updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ socketId, x, y }) => {
      const idx = participantsRef.current.findIndex((p) => p.socketId === socketId);
      if (idx !== -1) {
        participantsRef.current = participantsRef.current.map((p) =>
          p.socketId === socketId ? { ...p, x, y } : p
        );
      }
    };
    socket.on("participant:moved", handler);
    return () => socket.off("participant:moved", handler);
  }, [socket]);

  // Handle incoming reaction emojis
  useEffect(() => {
    if (!socket) return;
    const handler = ({ socketId, emoji }) => {
      reactionsMapRef.current.set(socketId, {
        emoji,
        timestamp: performance.now(),
      });
    };
    socket.on("participant:reaction", handler);
    return () => socket.off("participant:reaction", handler);
  }, [socket]);

  // Main render and movement loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const cleanupKeys = registerKeyListeners();
    let lastSend = 0;

    const loop = (timestamp) => {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale world to fit canvas container maintaining aspect ratio
      const scaleX = canvas.clientWidth / worldWidth;
      const scaleY = canvas.clientHeight / worldHeight;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (canvas.clientWidth - worldWidth * scale) / 2;
      const offsetY = (canvas.clientHeight - worldHeight * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Compute movement delta
      const { dx, dy } = computeMovementDelta(selfPosRef.current);
      if (dx !== 0 || dy !== 0) {
        // Move with obstacle collision detection and sliding
        const newPos = moveWithCollisions(
          selfPosRef.current,
          dx,
          dy,
          worldWidth,
          worldHeight,
          obstacles
        );

        if (newPos.x !== selfPosRef.current.x || newPos.y !== selfPosRef.current.y) {
          selfPosRef.current = newPos;

          // Update self in participants list
          const idx = participantsRef.current.findIndex((p) => p.socketId === selfId);
          if (idx !== -1) {
            participantsRef.current = participantsRef.current.map((p) =>
              p.socketId === selfId ? { ...p, x: newPos.x, y: newPos.y } : p
            );
          }

          // Send position to server (rate-limited)
          if (timestamp - lastSend > SEND_RATE) {
            socket?.emit("participant:move", { x: newPos.x, y: newPos.y });
            lastSend = timestamp;
          }
        }
      }

      // Draw entire world
      drawWorld(
        ctx,
        worldWidth,
        worldHeight,
        participantsRef.current,
        selfId,
        colorMapRef.current,
        officeData,
        getClickTarget(),
        reactionsMapRef.current
      );

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      cleanupKeys();
      clearClickTarget();
    };
  }, [socket, selfId, worldWidth, worldHeight, officeData, obstacles]);

  // Click-to-move canvas handler
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleX = canvas.clientWidth / worldWidth;
    const scaleY = canvas.clientHeight / worldHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.clientWidth - worldWidth * scale) / 2;
    const offsetY = (canvas.clientHeight - worldHeight * scale) / 2;

    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    if (worldX >= 0 && worldX <= worldWidth && worldY >= 0 && worldY <= worldHeight) {
      setClickTarget(Math.round(worldX), Math.round(worldY));
    }
  };

  const handleSendReaction = (emoji) => {
    if (!socket) return;
    socket.emit("participant:reaction", { emoji });
    reactionsMapRef.current.set(selfId, {
      emoji,
      timestamp: performance.now(),
    });
  };

  const handleLeave = useCallback(() => {
    socket?.emit("office:leave");
    closeAll();
    onLeave();
  }, [socket, closeAll, onLeave]);

  return (
    <div className="office-wrapper">
      {/* HUD Bar */}
      <div className="office-hud">
        <div className="hud-left">
          <span className="hud-badge nearby-badge">
            <span className="pulse-dot" /> {nearbyCount} in audio range
          </span>
          <span className="hud-office-name">
            🏢 {officeData.name || "Virtual Office"}
          </span>
        </div>

        {/* Quick Reaction Emojis */}
        <div className="reaction-bar" title="Click to share an emoji reaction">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              className="btn-reaction"
              onClick={() => handleSendReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>

        <button className="btn-leave" onClick={handleLeave}>
          Leave Office
        </button>
      </div>

      {/* Interactive 2D World Canvas */}
      <div className="canvas-container">
        <canvas ref={canvasRef} onClick={handleCanvasClick} />
      </div>

      {/* Movement and Navigation Helper */}
      <div className="move-hint">
        <span>Controls: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrows • <strong>Click anywhere</strong> to walk</span>
      </div>
    </div>
  );
}
