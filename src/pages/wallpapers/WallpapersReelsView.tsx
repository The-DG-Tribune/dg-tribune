import { useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, Download, Heart, Share2, Shuffle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category, Wallpaper } from "@/types/firestore";
import { getThumbnailUrl } from "@/services/cloudinary/upload";

interface WallpapersReelsViewProps {
  wallpapers: Wallpaper[];
  categories: Category[];
  isLiked: (id: string) => boolean;
  onLike: (wallpaper: Wallpaper) => void;
  onDownload: (wallpaper: Wallpaper) => void;
  onShare: (wallpaper: Wallpaper) => void;
  onExit: () => void;
  onShuffle: () => void;
  /** Changing this remounts the feed at the top (used after a shuffle). */
  feedKey?: string | number;
}

interface SlideProps {
  wallpaper: Wallpaper;
  category: Category | undefined;
  eager: boolean;
  isFirst: boolean;
  liked: boolean;
  onLike: () => void;
  onDownload: () => void;
  onShare: () => void;
}

function ReelSlide({ wallpaper, category, eager, isFirst, liked, onLike, onDownload, onShare }: SlideProps) {
  const [fit, setFit] = useState<"cover" | "contain">(
    wallpaper.orientation === "phone" ? "cover" : "contain"
  );
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);
  const src = getThumbnailUrl(wallpaper.imageUrl, 1100);

  function triggerLike() {
    if (!liked) onLike();
    setBurst(true);
    window.setTimeout(() => setBurst(false), 800);
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      triggerLike();
    }
    lastTap.current = now;
  }

  return (
    <section className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      {/* Blurred fill so wide or square images never look cropped or squashed */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-3xl"
      />

      <div
        className="relative mx-auto h-full w-full touch-manipulation md:max-w-[460px]"
        onDoubleClick={triggerLike}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={wallpaper.title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > 0) {
              setFit(img.naturalWidth / img.naturalHeight <= 0.8 ? "cover" : "contain");
            }
          }}
          className={cn(
            "absolute inset-0 h-full w-full select-none",
            fit === "cover" ? "object-cover" : "object-contain"
          )}
          draggable={false}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50" />

        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="h-24 w-24 animate-ping fill-accent text-accent" />
          </div>
        )}

        {/* Bottom-left: category + title */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pr-20">
          {category && (
            <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-caption font-semibold text-accent backdrop-blur-md">
              {category.name}
            </span>
          )}
          <h2 className="font-heading text-xl font-bold leading-tight text-white drop-shadow-lg">
            {wallpaper.title}
          </h2>
          {isFirst && (
            <p className="mt-2 flex animate-bounce items-center gap-1 text-caption text-white/70">
              <ChevronUp className="h-4 w-4" /> Swipe up for more
            </p>
          )}
        </div>

        {/* Right action rail */}
        <div
          onTouchEnd={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-3 z-10 flex flex-col items-center gap-5"
        >
          <button type="button" onClick={onLike} aria-label="Like" className="flex flex-col items-center gap-1 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-90">
              <Heart className={cn("h-6 w-6", liked && "fill-accent text-accent")} />
            </span>
            <span className="text-caption font-medium">{wallpaper.likeCount}</span>
          </button>
          <button type="button" onClick={onShare} aria-label="Share" className="flex flex-col items-center gap-1 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-90">
              <Share2 className="h-6 w-6" />
            </span>
            <span className="text-caption font-medium">Share</span>
          </button>
          <button type="button" onClick={onDownload} aria-label="Download" className="flex flex-col items-center gap-1 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-background shadow-lg transition-transform active:scale-90">
              <Download className="h-6 w-6" />
            </span>
            <span className="text-caption font-medium">Save</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Full-screen, snap-scrolling wallpaper feed (TikTok/Reels style).
 * Rendered in a portal over the whole site, so the navbar and footer never show through.
 */
export function WallpapersReelsView({
  wallpapers,
  categories,
  isLiked,
  onLike,
  onDownload,
  onShare,
  onExit,
  onShuffle,
  feedKey,
}: WallpapersReelsViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Lock the page behind the feed and add keyboard controls.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      const el = scrollRef.current;
      if (e.key === "Escape") onExit();
      if (!el) return;
      if (e.key === "ArrowDown") el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      if (e.key === "ArrowUp") el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onExit]);

  const categoryFor = (id: string | null) => categories.find((c) => c.id === id);

  const content =
    wallpapers.length === 0 ? (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState title="No wallpapers yet." description="Check back soon - new drops land here first." />
      </div>
    ) : (
      <div
        ref={scrollRef}
        key={feedKey}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientHeight > 0) setIndex(Math.round(el.scrollTop / el.clientHeight));
        }}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {wallpapers.map((wallpaper, i) => (
          <ReelSlide
            key={wallpaper.id}
            wallpaper={wallpaper}
            category={categoryFor(wallpaper.categoryId)}
            eager={i < 2}
            isFirst={i === 0}
            liked={isLiked(wallpaper.id)}
            onLike={() => onLike(wallpaper)}
            onDownload={() => onDownload(wallpaper)}
            onShare={() => onShare(wallpaper)}
          />
        ))}
      </div>
    );

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black" role="dialog" aria-modal="true" aria-label="Wallpaper reels">
      {content}

      {/* Top bar: always on top of the feed */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] bg-gradient-to-b from-black/60 to-transparent">
        <button
          type="button"
          onClick={onExit}
          aria-label="Close reels"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {wallpapers.length > 0 && (
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-caption font-medium text-white backdrop-blur-md">
              {Math.min(index + 1, wallpapers.length)} / {wallpapers.length}
            </span>
          )}
          <button
            type="button"
            onClick={onShuffle}
            aria-label="Shuffle"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
