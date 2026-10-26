const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f97316",
  "#10b981","#06b6d4","#eab308","#ef4444",
];

export function ParticipantList({ participants, selfId }) {
  return (
    <div className="participant-list">
      <h3 className="list-title">In Office <span className="count-badge">{participants.length}</span></h3>
      <ul className="list-items">
        {participants.map((p, i) => (
          <li key={p.socketId} className="list-item">
            <div
              className="avatar-dot"
              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            >
              {(p.displayName || "?")[0].toUpperCase()}
            </div>
            <span className="p-name">
              {p.displayName}
              {p.socketId === selfId && <span className="you-tag"> (you)</span>}
            </span>
            {p.muted && <span className="mute-badge">🔇</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
