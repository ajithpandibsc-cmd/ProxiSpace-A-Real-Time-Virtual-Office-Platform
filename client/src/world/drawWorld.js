/**
 * Canvas world drawing utilities for ProxiSpeak.
 * Renders the virtual office, architectural zones, furniture,
 * acoustic partitions, animated avatars, and proximity circles.
 */

const AVATAR_RADIUS = 18;
const FONT = "600 12px Inter, sans-serif";
const PROXIMITY_RADIUS = 150;

// Vivid curated avatar color palette
const AVATAR_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f97316", // Orange
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#eab308", // Amber
  "#ef4444", // Rose
];

function getColor(index) {
  return AVATAR_COLORS[Math.abs(index) % AVATAR_COLORS.length];
}

// Draw hi-tech floor grid with soft ambient radial gradients
function drawFloor(ctx, width, height, layout = {}) {
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
  ctx.lineWidth = 1;
  const grid = 50;
  for (let x = 0; x <= width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw architectural zones if configured
  const zones = layout?.zones || [];
  for (const zone of zones) {
    ctx.save();
    ctx.fillStyle = zone.color || "rgba(99, 102, 241, 0.04)";
    ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 12);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone Title Label
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(zone.name.toUpperCase(), zone.x + 14, zone.y + 22);
    ctx.restore();
  }
}

// Draw obstacles (desks, conference tables, walls, partitions, screens)
function drawObstacles(ctx, obstacles = []) {
  for (const obs of obstacles) {
    ctx.save();
    const { x, y, width: w, height: h, type, name, blocksSound } = obs;

    if (type === "wall") {
      // Sound-blocking acoustic wall or glass divider
      ctx.fillStyle = blocksSound ? "rgba(239, 68, 68, 0.25)" : "rgba(99, 102, 241, 0.25)";
      ctx.strokeStyle = blocksSound ? "#ef4444" : "#6366f1";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // Sound isolation badge for acoustic walls
      if (blocksSound && (w > 40 || h > 40)) {
        ctx.fillStyle = "#fca5a5";
        ctx.font = "700 9px Inter, sans-serif";
        ctx.textAlign = "center";
        const labelX = x + w / 2;
        const labelY = y + h / 2 + 3;
        ctx.fillText("🔇 ACOUSTIC", labelX, labelY);
      }
    } else if (type === "sofa") {
      // Breakout Lounge sofa
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();

      // Cushions
      ctx.fillStyle = "#334155";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name || "Lounge Area", x + w / 2, y + h / 2 + 4);
    } else if (type === "counter") {
      // Bar or Kitchen Counter
      ctx.fillStyle = "#27272a";
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e4e4e7";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`☕ ${name || "Coffee Bar"}`, x + w / 2, y + h / 2 + 4);
    } else {
      // Workstation Desk or Conference Table
      ctx.fillStyle = "#131d31";
      ctx.strokeStyle = "#243452";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // Dual monitor representations on desks
      if (w >= 100 && h >= 50) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x + w / 2 - 25, y + 10, 50, 4);
        ctx.fillStyle = "#475569";
        ctx.fillRect(x + w / 2 - 8, y + 15, 16, 6);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name || "Desk", x + w / 2, y + h / 2 + 10);
    }

    ctx.restore();
  }
}

// Draw click destination marker
function drawClickMarker(ctx, target, time) {
  if (!target) return;
  const pulse = (Math.sin(time / 150) + 1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(target.x, target.y, 6 + pulse * 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(99, 102, 241, ${0.4 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(target.x, target.y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#818cf8";
  ctx.fill();
  ctx.restore();
}

// Draw an avatar with speech aura, reactions, and badges
function drawAvatar(ctx, participant, isSelf, colorIndex, time, reactionsMap) {
  const { x, y, displayName, muted, socketId } = participant;
  const color = getColor(colorIndex);

  // Proximity aura for self
  if (isSelf) {
    const pulse = Math.sin(time / 400) * 3;
    const grad = ctx.createRadialGradient(x, y, 10, x, y, PROXIMITY_RADIUS + pulse);
    grad.addColorStop(0, "rgba(99, 102, 241, 0.12)");
    grad.addColorStop(0.7, "rgba(99, 102, 241, 0.04)");
    grad.addColorStop(1, "rgba(99, 102, 241, 0)");

    ctx.beginPath();
    ctx.arc(x, y, PROXIMITY_RADIUS + pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Active talking ring if not muted
  if (!muted) {
    const talkWave = (Math.sin(time / 120) + 1) * 3;
    ctx.beginPath();
    ctx.arc(x, y, AVATAR_RADIUS + 3 + talkWave, 0, Math.PI * 2);
    ctx.strokeStyle = isSelf ? "rgba(16, 185, 129, 0.4)" : "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Glow shadow
  ctx.shadowColor = color;
  ctx.shadowBlur = isSelf ? 20 : 10;

  // Main avatar circle
  ctx.beginPath();
  ctx.arc(x, y, AVATAR_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Self highlight ring
  if (isSelf) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Initials
  ctx.fillStyle = "#ffffff";
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((displayName || "?")[0].toUpperCase(), x, y);
  ctx.textBaseline = "alphabetic";

  // Name pill label
  const label = isSelf ? `${displayName} (you)` : displayName;
  ctx.font = "600 11px Inter, sans-serif";
  const textWidth = ctx.measureText(label).width;
  const pillW = textWidth + 14;
  const pillH = 18;
  const pillY = y + AVATAR_RADIUS + 6;

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeStyle = isSelf ? "rgba(99, 102, 241, 0.5)" : "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - pillW / 2, pillY, pillW, pillH, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSelf ? "#c7d2fe" : "#e2e8f0";
  ctx.fillText(label, x, pillY + 13);

  // Mute badge
  if (muted) {
    ctx.beginPath();
    ctx.arc(x + 13, y - 13, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✕", x + 13, y - 13);
    ctx.textBaseline = "alphabetic";
  }

  // Floating reaction emoji bubble (if recent reaction exists)
  const reaction = reactionsMap?.get(socketId);
  if (reaction && time - reaction.timestamp < 3500) {
    const elapsed = time - reaction.timestamp;
    const floatOffset = Math.min(30, elapsed / 30);
    const opacity = elapsed > 2800 ? (3500 - elapsed) / 700 : 1;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y - AVATAR_RADIUS - 16 - floatOffset, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(reaction.emoji, x, y - AVATAR_RADIUS - 16 - floatOffset);
    ctx.restore();
  }
}

export function drawWorld(
  ctx,
  worldWidth,
  worldHeight,
  participants,
  selfId,
  colorMap,
  officeData = {},
  clickTarget = null,
  reactionsMap = null
) {
  const time = performance.now();
  ctx.clearRect(0, 0, worldWidth, worldHeight);

  // Draw floor & grid
  drawFloor(ctx, worldWidth, worldHeight, officeData?.layout);

  // Draw obstacles & furniture
  drawObstacles(ctx, officeData?.obstacles || []);

  // Draw click destination marker
  if (clickTarget) {
    drawClickMarker(ctx, clickTarget, time);
  }

  // Draw participants: other avatars first, self on top
  const others = participants.filter((p) => p.socketId !== selfId);
  const self = participants.find((p) => p.socketId === selfId);

  others.forEach((p) => {
    drawAvatar(ctx, p, false, colorMap.get(p.socketId) || 0, time, reactionsMap);
  });

  if (self) {
    drawAvatar(ctx, self, true, colorMap.get(self.socketId) || 0, time, reactionsMap);
  }
}
