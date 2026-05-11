import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { Icon } from "@/components/Icon";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell() {
  const auth = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    if (!location.pathname.startsWith("/search")) {
      setTopSearch("");
    }
  }, [location.pathname]);

  function submitSearch(value: string): void {
    const q = value.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="eden-root">
      <Sidebar user={auth.user} />

      <div className="eden-main-column">
        <header className="eden-topbar">
          <div className="eden-topbar-left">
            <button
              type="button"
              className="btn-icon btn-ghost"
              aria-label="Back"
              onClick={() => navigate(-1)}
            >
              <Icon name="back" size={16} />
            </button>
            <button
              type="button"
              className="btn-icon btn-ghost"
              aria-label="Forward"
              onClick={() => navigate(1)}
            >
              <Icon name="forward" size={16} />
            </button>

            <label className="eden-search-bar" aria-label="Search Eden">
              <span className="eden-search-icon">
                <Icon name="search" size={16} />
              </span>
              <input
                value={topSearch}
                onChange={(e) => setTopSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch(topSearch);
                }}
                placeholder="Search tracks, artists, albums"
              />
            </label>
          </div>

          <div className="eden-topbar-right">
            {auth.user ? (
              <>
                <span className="eden-topbar-greeting">Hi, {auth.user.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    auth.logout();
                    navigate("/auth");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={() => navigate("/auth")}>
                Sign in
              </button>
            )}
          </div>
        </header>

        <main className="eden-content">
          <Outlet />
        </main>
      </div>

      <PlayerBar />
    </div>
  );
}
