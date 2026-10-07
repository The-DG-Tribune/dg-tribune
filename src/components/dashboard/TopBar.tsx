import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/services/firebase/auth";
import { useToast } from "@/context/ToastContext";
import { ROUTES } from "@/constants/routes";

interface TopBarProps {
  onOpenMobileNav: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * TopBar - Document 05: search, admin identity, logout.
 * The hamburger only appears below md, where it opens
 * DashboardMobileDrawer instead of the fixed Sidebar.
 */
export function TopBar({
  onOpenMobileNav,
  searchValue,
  onSearchChange,
}: TopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await signOut();
    showToast("Signed out");
    navigate(ROUTES.adminLogin, { replace: true });
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex h-10 w-10 items-center justify-center rounded-button text-text-secondary hover:bg-surface hover:text-text transition-colors duration-button md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 max-w-md">
        <SearchInput
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
          placeholder="Search content…"
        />
      </div>

      <div ref={menuRef} className="relative ml-auto">
        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-button px-2 py-1.5 hover:bg-surface transition-colors duration-button"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-small font-semibold">
            {initial}
          </span>
          <ChevronDown className="hidden sm:block h-4 w-4 text-text-secondary" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-input border border-border bg-surface shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-divider">
              <p className="text-small text-text truncate">{user?.email}</p>
              <p className="text-caption text-text-secondary">Administrator</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-small text-text hover:bg-background transition-colors duration-button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
