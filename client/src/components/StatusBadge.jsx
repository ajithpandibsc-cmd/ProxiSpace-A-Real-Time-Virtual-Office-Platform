export function StatusBadge({ connected, error }) {
  if (error) return <span className="status-badge error">⚠️ {error}</span>;
  return (
    <span className={`status-badge ${connected ? "connected" : "disconnected"}`}>
      {connected ? "🟢 Connected" : "🔴 Disconnected"}
    </span>
  );
}
