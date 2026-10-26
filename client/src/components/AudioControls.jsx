export function AudioControls({
  micState,
  muted,
  audioLevel = 0,
  onRequestMic,
  onToggleMute,
  volume,
  onVolumeChange,
}) {
  return (
    <div className="audio-controls">
      <h3 className="list-title">Spatial Audio Controls</h3>

      {/* Microphone permission state */}
      {micState === "idle" && (
        <button id="enable-mic-btn" className="btn-secondary" onClick={onRequestMic}>
          🎤 Enable Microphone
        </button>
      )}

      {micState === "requesting" && (
        <p className="audio-hint">Waiting for microphone permission…</p>
      )}

      {micState === "denied" && (
        <p className="audio-error">
          ❌ Microphone access was blocked. Please allow mic permissions in your browser bar and reload.
        </p>
      )}

      {micState === "error" && (
        <p className="audio-error">❌ Microphone initialization error. Please reload.</p>
      )}

      {micState === "granted" && (
        <div className="mic-active-panel">
          <div className="mic-status-row">
            <span className={`mic-indicator ${muted ? "muted" : "active"}`} />
            <span className="mic-status-text">
              {muted ? "Microphone Muted" : "Microphone Live"}
            </span>
          </div>

          {/* Real-time Voice VU Meter */}
          {!muted && (
            <div className="vu-meter-container" title="Live audio input volume">
              <div className="vu-meter-label">
                <span>Mic Level</span>
                <span className="vu-meter-val">{audioLevel}%</span>
              </div>
              <div className="vu-meter-track">
                <div
                  className="vu-meter-fill"
                  style={{
                    width: `${Math.max(4, audioLevel)}%`,
                    backgroundColor:
                      audioLevel > 75 ? "#ef4444" : audioLevel > 40 ? "#10b981" : "#06b6d4",
                  }}
                />
              </div>
            </div>
          )}

          <button
            id="mute-btn"
            className={`btn-secondary ${muted ? "btn-muted" : "btn-unmuted"}`}
            onClick={onToggleMute}
          >
            {muted ? "🔇 Unmute Microphone" : "🎙️ Mute Microphone"}
          </button>
        </div>
      )}

      {/* Master Volume Output */}
      <div className="volume-row">
        <div className="volume-label-row">
          <label htmlFor="volume-slider" className="field-label">
            Master Spatial Volume
          </label>
          <span className="volume-value">{Math.round(volume * 100)}%</span>
        </div>
        <input
          id="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="audio-tips">
        <p>💡 Tip: Audio pans left/right and fades smoothly as avatars move around you.</p>
      </div>
    </div>
  );
}
