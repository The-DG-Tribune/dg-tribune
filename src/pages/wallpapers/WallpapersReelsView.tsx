import { Heart, Share2, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category, Wallpaper } from "@/types/firestore";

interface WallpapersReelsViewProps {
  wallpapers: Wallpaper[];
  categories: Category[];
  isLiked: (id: string) => boolean;
  onLike: (wallpaper: Wallpaper) => void;
  onDownload: (wallpaper: Wallpaper) => void;
  onShare: (wallpaper: Wallpaper) => void;
  /** Changing this forces the feed to remount at the top - used when
   * the order is reshuffled, so scroll position resets cleanly. */
  feedKey?: string | number;
}

/**
 * WallpapersReelsView - a TikTok/Reels-style vertical feed. Each
 * wallpaper is a full-height snap-scroll slide with a right-side
 * action rail (like, share, download - no comments, by design).
 * Scroll-snap is CSS-only, so it works the same on trackpad, mouse
 * wheel, and mobile touch scroll without any JS scroll-hijacking.
 */
export function WallpapersReelsView({
  wallpapers,
  categories,
  isLiked,
  onLike,
  onDownload,
  onShare,
  feedKey,
}: WallpapersReelsViewProps) {
  const categoryFor = (id: string | null) => categories.find((c) => c.id === id);

  if (wallpapers.length === 0) {
    return (
      <EmptyState
        title="No wallpapers yet."
        description="Check back soon - new drops land here first."
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm sm:max-w-md lg:max-w-xl xl:max-w-2xl">
      <div
        key={feedKey}
        className="h-[calc(100dvh-220px)] min-h-[480px] lg:min-h-[600px] snap-y snap-mandatory overflow-y-auto rounded-container border border-white/10 bg-black [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {wallpapers.map((wallpaper) => {
          const liked = isLiked(wallpaper.id);
          const category = categoryFor(wallpaper.categoryId);
          return (
            <div
              key={wallpaper.id}
              className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden"
            >
              {/* Blurred backdrop fill - so a landscape or square
               * wallpaper never gets squished or harshly cropped to
               * fit this portrait frame. The real image always shows
               * in full via object-contain in the foreground; this
               * backdrop just fills the space behind it, the way
               * Instagram Stories/Spotify handle mismatched aspect
               * media. */}
              <img
                src={wallpaper.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover object-top opacity-50 blur-2xl"
              />
              <img
                src={wallpaper.imageUrl}
                alt={wallpaper.title}
                className="relative z-[1] max-h-full max-w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Top: category + DG watermark */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                {category ? <Badge variant="accent">{category.name}</Badge> : <span />}
                <span className="font-heading text-caption font-bold text-white/90">
                  DG <span className="text-accent">Tribune</span>
                </span>
              </div>

              {/* Bottom: title */}
              <div className="absolute inset-x-0 bottom-0 p-4 pr-16">
                <p className="font-heading text-card-title text-white">{wallpaper.title}</p>
              </div>

              {/* Right action rail */}
              <div className="absolute bottom-6 right-3 flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => onLike(wallpaper)}
                  aria-label="Like"
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl transition-transform duration-button active:scale-90">
                    <Heart className={cn("h-5 w-5", liked && "fill-accent text-accent")} />
                  </span>
                  <span className="text-caption">{wallpaper.likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShare(wallpaper)}
                  aria-label="Share"
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl transition-transform duration-button active:scale-90">
                    <Share2 className="h-5 w-5" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(wallpaper)}
                  aria-label="Download"
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-background transition-transform duration-button active:scale-90">
                    <Download className="h-5 w-5" />
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-caption text-text-secondary">
        Scroll to browse - like, share or download as you go.
      </p>
    </div>
  );
}
