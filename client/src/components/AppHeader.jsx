export function AppHeader({ inOffice, officeName }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-icon">🎙️</span>
        <span className="brand-name">ProxiSpeak</span>
      </div>
      {inOffice && (
        <div className="header-office">
          <span className="office-dot" />
          <span>{officeName || "Virtual Office"}</span>
        </div>
      )}
    </header>
  );
}
