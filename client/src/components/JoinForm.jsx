import { useState, useEffect } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const AVATAR_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Cyan", hex: "#06b6d4" },
];

export function JoinForm({ onJoin, connecting }) {
  const [displayName, setDisplayName] = useState("");
  const [officeId, setOfficeId] = useState("main");
  const [customOffice, setCustomOffice] = useState("");
  const [offices, setOffices] = useState([
    { name: "Main Virtual HQ", slug: "main" },
    { name: "Innovation Lab", slug: "lab" },
    { name: "Zen Breakout Lounge", slug: "lounge" },
  ]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].hex);
  const [error, setError] = useState("");

  // Fetch available offices from backend
  useEffect(() => {
    fetch(`${SERVER_URL}/api/offices`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOffices(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Please enter a display name.");
      return;
    }
    if (name.length > 32) {
      setError("Name must be 32 characters or less.");
      return;
    }

    const selectedOffice = officeId === "custom" ? customOffice.trim().toLowerCase() : officeId;
    if (!selectedOffice) {
      setError("Please specify an office room identifier.");
      return;
    }

    setError("");
    onJoin({
      displayName: name,
      officeId: selectedOffice,
      color: selectedColor,
    });
  };

  return (
    <div className="join-wrapper">
      <div className="join-card">
        <div className="join-hero">
          <div className="join-icon">🎙️</div>
          <h1 className="join-title">ProxiSpeak</h1>
          <p className="join-subtitle">
            Step into your virtual office. Walk close to chat naturally, step away for quiet focus.
          </p>
        </div>

        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="displayName" className="field-label">
              Your Name
            </label>
            <input
              id="displayName"
              className="field-input"
              type="text"
              placeholder="e.g. Ajith"
              maxLength={32}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              autoFocus
            />
          </div>

          <div className="field-group">
            <label htmlFor="officeId" className="field-label">
              Select Virtual Office
            </label>
            <select
              id="officeId"
              className="field-input"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
            >
              {offices.map((off) => (
                <option key={off.slug} value={off.slug}>
                  {off.name} ({off.slug})
                </option>
              ))}
              <option value="custom">➕ Custom Room...</option>
            </select>
          </div>

          {officeId === "custom" && (
            <div className="field-group">
              <label htmlFor="customOffice" className="field-label">
                Custom Room Name
              </label>
              <input
                id="customOffice"
                className="field-input"
                type="text"
                placeholder="e.g. design-sprint"
                maxLength={32}
                value={customOffice}
                onChange={(e) => setCustomOffice(e.target.value)}
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Avatar Accent</label>
            <div className="color-picker-row">
              {AVATAR_COLORS.map((col) => (
                <button
                  type="button"
                  key={col.hex}
                  className={`color-swatch ${selectedColor === col.hex ? "active" : ""}`}
                  style={{ background: col.hex }}
                  onClick={() => setSelectedColor(col.hex)}
                  title={col.name}
                />
              ))}
            </div>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button
            id="join-btn"
            className="btn-primary"
            type="submit"
            disabled={connecting}
          >
            {connecting ? "Entering Space…" : "Enter Office Space →"}
          </button>
        </form>

        <div className="join-footer-features">
          <span>🎧 Stereo 3D Audio</span>
          <span>•</span>
          <span>📐 Proximity Hysteresis</span>
          <span>•</span>
          <span>🔇 Acoustic Walls</span>
        </div>
      </div>
    </div>
  );
}
