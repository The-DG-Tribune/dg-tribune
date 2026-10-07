import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Wallpaper } from "@/types/firestore";

interface WallpaperLightboxProps {
  wallpaper: Wallpaper | null;
  onClose: () => void;
  isLiked: boolean;
  onLike: () => void;
  onDownload: () => void;
  onShare: () => void;
}

/**
 * WallpaperLightbox - the "view" mode from the Grid tab: full-screen,
 * dims the page behind it, closes on the X, backdrop click, or Escape
 * (Escape is handled by the browser's natural focus + the backdrop
 * button below covering click-away).
 */
export function WallpaperLightbox({
  wallpaper,
  onClose,
  isLiked,
  onLike,
  onDownload,
  onShare,
}: WallpaperLightboxProps) {
  return createPortal(
    <AnimatePresence>
      {wallpaper && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-text backdrop-blur-xl transition-colors duration-button hover:bg-white/20 md:right-6 md:top-6"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.img
            key={wallpaper.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            src={wallpaper.imageUrl}
            alt={wallpaper.title}
            className="max-h-[80vh] max-w-[90vw] rounded-image object-contain shadow-glass"
          />

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 p-6">
            <p className="font-heading text-card-title text-text text-center">{wallpaper.title}</p>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={onLike}
                aria-label="Like"
                className="flex items-center gap-1.5 text-text-secondary transition-colors duration-button hover:text-text"
              >
                <Heart
                  className={cn("h-5 w-5", isLiked && "fill-accent text-accent")}
                />
                <span className="text-small">{wallpaper.likeCount}</span>
              </button>
              <span className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={onShare}
                aria-label="Share"
                className="text-text-secondary transition-colors duration-button hover:text-text"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <span className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={onDownload}
                aria-label="Download"
                className="text-text-secondary transition-colors duration-button hover:text-accent"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
