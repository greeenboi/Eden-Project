import { NavLink } from "react-router-dom";
import type { AuthUser } from "@/types/contracts";

interface SidebarProps {
  user: AuthUser | null;
}

const navItems = [
  { to: "/", label: "Home" },
  { to: "/songs", label: "All Songs" },
  { to: "/artists", label: "Artists" },
  { to: "/search", label: "Search" },
  { to: "/queue", label: "Queue" },
  { to: "/settings", label: "Settings" },
  { to: "/admin-upload", label: "Upload Stub" },
  { to: "/admin-dashboard", label: "Admin Stub" },
];

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="eden-sidebar">
      <div className="eden-brand">
        <h1>Eden</h1>
        <p>Desktop Player</p>
      </div>

      <nav className="eden-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "eden-nav-link eden-nav-link-active" : "eden-nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="eden-sidebar-footer">
        <p className="eden-muted">Signed in as</p>
        <p>{user?.name ?? "Guest"}</p>
      </div>
    </aside>
  );
}
