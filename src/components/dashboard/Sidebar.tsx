import { NavLink } from "react-router-dom";
import { Link } from "react-router-dom";
import { DASHBOARD_NAV_ITEMS } from "@/constants/dashboardNav";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to={ROUTES.dashboard}
        onClick={onNavigate}
        className="flex h-16 items-center px-6 font-heading text-card-title font-bold text-text border-b border-border shrink-0"
      >
        DG <span className="text-accent">Tribune</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === ROUTES.dashboard}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-button px-3 py-2.5 text-small font-medium transition-colors duration-button",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-background hover:text-text"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/** Fixed sidebar shown on desktop (md and above). */
export function Sidebar() {
  return (
    <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-border bg-surface z-20">
      <SidebarContent />
    </aside>
  );
}

export { SidebarContent };
