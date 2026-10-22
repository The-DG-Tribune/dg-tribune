import { useDocumentHead } from "@/hooks/useDocumentHead";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Apple, Bot, Heart, LayoutGrid, Monitor, Play, Shuffle, Smartphone, Tablet } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/context/ToastContext";
import { useWallpaperLikes } from "@/hooks/useWallpaperLikes";
import { downloadImageFile, wallpaperFilename, shareUrl } from "@/utils/wallpaperActions";
import { getCollectionDocs, incrementField } from "@/services/firebase/firestore";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { WallpapersGridView } from "@/pages/wallpapers/WallpapersGridView";
import { WallpapersReelsView } from "@/pages/wallpapers/WallpapersReelsView";
import { WallpaperLightbox } from "@/components/wallpapers/WallpaperLightbox";
import type { Category, Wallpaper } from "@/types/firestore";

type Tab = "grid" | "reels";
type DeviceFilter = "all" | "phone" | "tablet" | "desktop" | "saved";
type PlatformFilter = "any" | "apple" | "android";

export default function WallpapersPage() {
  useDocumentHead({
    title: "Football Wallpapers for Phone, Tablet & Desktop",
    description: "Free HD football wallpapers for iPhone, Android, tablet and desktop. Download or browse in full-screen reels.",
  });
  const { showToast } = useToast();
  const { isLiked, toggleLike } = useWallpaperLikes();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTabState] = useState<Tab>(searchParams.get("tab") === "reels" ? "reels" : "grid");
  const [reelsShuffleSeed, setReelsShuffleSeed] = useState(() => Date.now());

  function setTab(next: Tab) {
    setTabState(next);
    setSearchParams(next === "reels" ? { tab: "reels" } : {}, { replace: true });
    // A fresh shuffle every time you (re-)enter Reels, so it never
    // opens on the same wallpaper twice in a row.
    if (next === "reels") setReelsShuffleSeed(Date.now());
  }
  const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Wallpaper | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("any");

  async function load() {
    setError(null);
    try {
      const [wallpaperDocs, categoryDocs] = await Promise.all([
        getCollectionDocs<Wallpaper>("wallpapers", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
        getCollectionDocs<Category>("categories", {}),
      ]);
      wallpaperDocs.sort((a, b) => b.updatedAt - a.updatedAt);
      setWallpapers(wallpaperDocs);
      setCategories(categoryDocs);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleLike(wallpaper: Wallpaper) {
    const nowLiked = toggleLike(wallpaper.id);
    setWallpapers((prev) =>
      prev
        ? prev.map((w) =>
            w.id === wallpaper.id
              ? { ...w, likeCount: w.likeCount + (nowLiked ? 1 : -1) }
              : w
          )
        : prev
    );
    setViewing((prev) =>
      prev && prev.id === wallpaper.id
        ? { ...prev, likeCount: prev.likeCount + (nowLiked ? 1 : -1) }
        : prev
    );
  }

  async function handleDownload(wallpaper: Wallpaper) {
    try {
      await downloadImageFile(wallpaper.imageUrl, wallpaperFilename(wallpaper.title));
      incrementField("wallpapers", wallpaper.id, "downloadCount");
      setWallpapers((prev) =>
        prev
          ? prev.map((w) =>
              w.id === wallpaper.id ? { ...w, downloadCount: w.downloadCount + 1 } : w
            )
          : prev
      );
      showToast("Download started");
    } catch {
      showToast("Couldn't download this wallpaper - try again", "error");
    }
  }

  async function handleShare(wallpaper: Wallpaper) {
    const url = `${window.location.origin}${ROUTES.wallpapers}?w=${wallpaper.slug}`;
    const result = await shareUrl(url, wallpaper.title);
    if (result === "copied") showToast("Link copied");
  }

  const hasDesktop = wallpapers?.some((w) => w.orientation === "desktop") ?? false;
  const hasTablet = wallpapers?.some((w) => w.orientation === "tablet" || w.orientation === "square") ?? false;
  const hasPlatforms = wallpapers?.some((w) => w.platform === "apple" || w.platform === "android") ?? false;
  const filteredWallpapers =
    wallpapers?.filter((w) => {
      if (activeCategoryId !== "all" && w.categoryId !== activeCategoryId) return false;
      if (deviceFilter === "saved") return isLiked(w.id);
      if (platformFilter === "apple" && w.platform === "android") return false;
      if (platformFilter === "android" && w.platform === "apple") return false;
      if (deviceFilter === "desktop") return w.orientation === "desktop";
      if (deviceFilter === "tablet") return w.orientation === "tablet" || w.orientation === "square";
      // Older wallpapers have no orientation and were all phone-sized.
      if (deviceFilter === "phone") return !w.orientation || w.orientation === "phone";
      return true;
    }) ?? [];

  // Deterministic-per-seed shuffle - re-runs whenever reelsShuffleSeed
  // changes (entering the tab, or the manual shuffle button), so the
  // feed doesn't always start on the same wallpaper.
  const reelsWallpapers = useMemo(() => {
    if (!wallpapers) return [];
    const arr = wallpapers.filter((w) => w.orientation !== "desktop");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpapers, reelsShuffleSeed]);

  return (
    <Container>
      <div className="py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-page-title text-text mb-1">Wallpapers</h1>
            <p className="text-body text-text-secondary">
              High-quality wallpapers, ready to download. New drops added regularly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tab === "reels" && (
              <button
                type="button"
                onClick={() => setReelsShuffleSeed(Date.now())}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-small font-medium text-text-secondary transition-colors duration-button hover:text-accent"
              >
                <Shuffle className="h-4 w-4" />
                Shuffle
              </button>
            )}
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setTab("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-small font-medium transition-colors duration-button",
                  tab === "grid" ? "bg-accent text-background" : "text-text-secondary hover:text-text"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setTab("reels")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-small font-medium transition-colors duration-button",
                  tab === "reels" ? "bg-accent text-background" : "text-text-secondary hover:text-text"
                )}
              >
                <Play className="h-4 w-4" />
                Reels
              </button>
            </div>
          </div>
        </div>

        {tab === "grid" && wallpapers !== null && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { id: "all", label: "All", icon: null },
              { id: "phone", label: "Phone", icon: Smartphone },
              ...(hasTablet ? [{ id: "tablet", label: "Tablet", icon: Tablet }] : []),
              ...(hasDesktop ? [{ id: "desktop", label: "Desktop", icon: Monitor }] : []),
              { id: "saved", label: "Saved", icon: Heart },
            ] as { id: DeviceFilter; label: string; icon: typeof Heart | null }[]).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDeviceFilter(f.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-small font-medium transition-colors duration-button",
                  deviceFilter === f.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text"
                )}
              >
                {f.icon && <f.icon className="h-4 w-4" />}
                {f.label}
              </button>
            ))}
            {hasPlatforms && (
              <>
                <span className="mx-1 my-1 w-px shrink-0 bg-white/10" aria-hidden="true" />
                {([
                  { id: "apple", label: "Apple", icon: Apple },
                  { id: "android", label: "Android", icon: Bot },
                ] as { id: PlatformFilter; label: string; icon: typeof Apple }[]).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPlatformFilter((cur) => (cur === f.id ? "any" : f.id))}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-small font-medium transition-colors duration-button",
                      platformFilter === f.id
                        ? "border-accent-secondary bg-accent-secondary/10 text-accent-secondary"
                        : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text"
                    )}
                  >
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {error ? (
          <ErrorState description={error} onRetry={load} />
        ) : wallpapers === null ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="mb-4 w-full break-inside-avoid"
                style={{ height: `${180 + (i % 3) * 60}px` }}
              />
            ))}
          </div>
        ) : tab === "grid" ? (
          <WallpapersGridView
            wallpapers={filteredWallpapers}
            categories={categories}
            activeCategoryId={activeCategoryId}
            onCategoryChange={setActiveCategoryId}
            isLiked={isLiked}
            onLike={handleLike}
            onDownload={handleDownload}
            onView={setViewing}
          />
        ) : (
          <WallpapersReelsView
            wallpapers={reelsWallpapers}
            feedKey={reelsShuffleSeed}
            categories={categories}
            isLiked={isLiked}
            onLike={handleLike}
            onDownload={handleDownload}
            onShare={handleShare}
            onExit={() => setTab("grid")}
            onShuffle={() => setReelsShuffleSeed(Date.now())}
          />
        )}
      </div>

      <WallpaperLightbox
        wallpaper={viewing}
        onClose={() => setViewing(null)}
        isLiked={viewing ? isLiked(viewing.id) : false}
        onLike={() => viewing && handleLike(viewing)}
        onDownload={() => viewing && handleDownload(viewing)}
        onShare={() => viewing && handleShare(viewing)}
      />
    </Container>
  );
}
