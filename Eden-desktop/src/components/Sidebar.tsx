import { NavLink } from "react-router-dom";
import { Icon } from "@/components/Icon";
import type { AuthUser } from "@/types/contracts";

interface SidebarProps {
  user: AuthUser | null;
}

type IconName = Parameters<typeof Icon>[0]["name"];

const browseNav: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/search", label: "Search", icon: "search" },
];

const libraryNav: { to: string; label: string; icon: IconName }[] = [
  { to: "/songs", label: "All Songs", icon: "library" },
  { to: "/artists", label: "Artists", icon: "artist" },
  { to: "/queue", label: "Queue", icon: "queue" },
];

const systemNav: { to: string; label: string; icon: IconName }[] = [
  { to: "/settings", label: "Settings", icon: "settings" },
  { to: "/admin-upload", label: "Upload", icon: "upload" },
  { to: "/admin-dashboard", label: "Dashboard", icon: "dashboard" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="eden-sidebar">
      <div className="eden-brand">
        <div className="eden-brand-mark">E</div>
        <div>
          <h1>Eden</h1>
          <p>Sound system</p>
        </div>
      </div>

      <NavSection label="Browse" items={browseNav} />
      <NavSection label="Your library" items={libraryNav} />
      <NavSection label="System" items={systemNav} />

      <div className="eden-sidebar-footer">
        <div className="eden-avatar">{initials(user?.name ?? "Guest")}</div>
        <div className="eden-avatar-meta">
          <strong>{user?.name ?? "Guest"}</strong>
          <span>{user?.role ?? "Listener"}</span>
        </div>
      </div>
    </aside>
  );
}

interface NavSectionProps {
  label: string;
  items: { to: string; label: string; icon: IconName }[];
}

function NavSection({ label, items }: NavSectionProps) {
  return (
    <div>
      <p className="eden-nav-section-label">{label}</p>
      <nav className="eden-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "eden-nav-link eden-nav-link-active" : "eden-nav-link"
            }
          >
            <span className="eden-nav-icon">
              <Icon name={item.icon} size={16} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
