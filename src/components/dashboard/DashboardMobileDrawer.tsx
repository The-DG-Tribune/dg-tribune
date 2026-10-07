import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SidebarContent } from "@/components/dashboard/Sidebar";

interface DashboardMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DashboardMobileDrawer - Document 05 "Responsive Drawer".
 * Same nav items as the desktop Sidebar, slid in from the left on
 * mobile/tablet so the CMS is fully usable on a phone.
 */
export function DashboardMobileDrawer({
  isOpen,
  onClose,
}: DashboardMobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] bg-surface border-r border-border md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 rounded-button p-2 text-text-secondary hover:bg-background hover:text-text transition-colors duration-button"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
