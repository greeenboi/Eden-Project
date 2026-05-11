import { useState } from "react";
import { API_BASE_URL } from "@/config/env";

export function SettingsPage() {
  const [minimizeToTray, setMinimizeToTray] = useState(true);

  return (
    <section>
      <h2>Settings</h2>
      <p className="eden-muted">API Base URL: {API_BASE_URL}</p>

      <label className="eden-switch-row" htmlFor="minimize-to-tray">
        <input
          id="minimize-to-tray"
          type="checkbox"
          checked={minimizeToTray}
          onChange={(event) => setMinimizeToTray(event.currentTarget.checked)}
        />
        Minimize to tray
      </label>
    </section>
  );
}
