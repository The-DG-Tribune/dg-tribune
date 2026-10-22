import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MobileDrawer - glass slide-in panel with a staggered nav item
 * reveal, matching the rest of the site's frosted-glass language.
 */
export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  // Rendered straight into <body>. Inside the navbar, its frosted-glass
  // effect trapped the "fixed" panel in the header strip, which is why the
  // menu looked see-through and the links spilled over the page.
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/80 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            style={{ backgroundColor: "#0B0F19" }}
            className="fixed inset-y-0 right-0 z-[100] flex h-[100dvh] w-[84%] max-w-xs flex-col overflow-y-auto border-l border-white/10 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-button hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <motion.nav
              className="flex flex-col gap-1"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {NAV_ITEMS.map((item) => (
                <motion.div
                  key={item.href}
                  variants={{
                    hidden: { opacity: 0, x: 16 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                >
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-button px-4 py-3 text-body font-medium transition-colors duration-button",
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-text hover:bg-white/[0.04]"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
            </motion.nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
