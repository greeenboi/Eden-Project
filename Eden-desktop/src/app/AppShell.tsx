import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell() {
  const auth = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="eden-root">
      <Sidebar user={auth.user} />

      <div className="eden-main-column">
        <header className="eden-topbar">
          <p>{auth.user ? `Welcome ${auth.user.name}` : "Guest mode"}</p>
          {auth.user ? (
            <button
              type="button"
              onClick={() => {
                auth.logout();
                navigate("/auth");
              }}
            >
              Sign out
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/auth")}>Sign in</button>
          )}
        </header>

        <main className="eden-content">
          <Outlet />
        </main>

        <PlayerBar />
      </div>
    </div>
  );
}
