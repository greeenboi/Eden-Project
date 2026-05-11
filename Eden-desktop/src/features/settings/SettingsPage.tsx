import { useState } from "react";
import { API_BASE_URL } from "@/config/env";

export function SettingsPage() {
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [highQuality, setHighQuality] = useState(true);

  return (
    <section className="eden-section">
      <div className="eden-section-title">
        <span className="eden-section-eyebrow">Preferences</span>
        <h2>Settings</h2>
      </div>

      <div className="eden-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        <article className="eden-card" style={{ cursor: "default" }}>
          <p className="eden-card-title">Connection</p>
          <p className="eden-card-subtitle eden-mono" style={{ whiteSpace: "normal" }}>
            {API_BASE_URL}
          </p>
        </article>

        <article className="eden-card" style={{ cursor: "default" }}>
          <p className="eden-card-title">Window</p>
          <label className="eden-switch-row" style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.4rem" }}>
            <input
              type="checkbox"
              checked={minimizeToTray}
              onChange={(event) => setMinimizeToTray(event.currentTarget.checked)}
              style={{ width: "auto", minHeight: 0 }}
            />
            <span className="eden-muted">Minimize to tray on close</span>
          </label>
        </article>

        <article className="eden-card" style={{ cursor: "default" }}>
          <p className="eden-card-title">Audio quality</p>
          <label className="eden-switch-row" style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.4rem" }}>
            <input
              type="checkbox"
              checked={highQuality}
              onChange={(event) => setHighQuality(event.currentTarget.checked)}
              style={{ width: "auto", minHeight: 0 }}
            />
            <span className="eden-muted">Prefer 320kbps when available</span>
          </label>
        </article>
      </div>
    </section>
  );
}
