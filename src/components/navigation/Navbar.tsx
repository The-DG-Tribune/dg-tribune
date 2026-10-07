import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search as SearchIcon, Menu } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { NAV_ITEMS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";

/**
 * Navbar - glassmorphic, sticky, condenses slightly on scroll. The
 * active nav link gets a shared "pill" that slides between links via
 * framer-motion's layoutId (an iOS-tab-bar style transition) instead
 * of a static underline.
 */
export function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-all duration-300",
        isScrolled
          ? "border-white/10 bg-background/80 backdrop-blur-xl shadow-glass"
          : "border-transparent bg-background/40 backdrop-blur-md"
      )}
    >
      <Container>
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-300",
            isScrolled ? "h-14" : "h-16"
          )}
        >
          <Link
            to={ROUTES.home}
            className="group font-heading text-card-title font-bold tracking-tight text-text"
          >
            <span className="transition-colors duration-button group-hover:text-white">DG</span>{" "}
            <span className="bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
              Tribune
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className="relative rounded-button px-4 py-2 text-small font-medium"
                >
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 rounded-button bg-accent/10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative transition-colors duration-button",
                      isActive ? "text-accent" : "text-text-secondary hover:text-text"
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.search}
              aria-label="Search DG Tribune"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-button hover:border-accent/40 hover:text-accent"
            >
              <SearchIcon className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-button hover:border-accent/40 hover:text-accent md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Container>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </header>
  );
}
