import { Download, Eye, Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category, Wallpaper } from "@/types/firestore";

interface WallpapersGridViewProps {
  wallpapers: Wallpaper[];
  categories: Category[];
  activeCategoryId: string | "all";
  onCategoryChange: (id: string | "all") => void;
  isLiked: (id: string) => boolean;
  onLike: (wallpaper: Wallpaper) => void;
  onDownload: (wallpaper: Wallpaper) => void;
  onView: (wallpaper: Wallpaper) => void;
}

export function WallpapersGridView({
  wallpapers,
  categories,
  activeCategoryId,
  onCategoryChange,
  isLiked,
  onLike,
  onDownload,
  onView,
}: WallpapersGridViewProps) {
  const categoryFor = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div>
      {/* Category filter pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-small font-medium transition-colors duration-button",
            activeCategoryId === "all"
              ? "border-accent bg-accent/10 text-accent"
              : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text"
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-small font-medium transition-colors duration-button",
              activeCategoryId === category.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {wallpapers.length === 0 ? (
        <EmptyState
          title="No wallpapers in this category yet."
          description="Try a different category, or check back soon."
        />
      ) : (
        // CSS-columns masonry, not a fixed-aspect grid - each tile
        // keeps the wallpaper's real proportions (portrait, landscape,
        // iPad, anything) instead of being force-cropped or squished
        // into one shape.
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:balance]">
          {wallpapers.map((wallpaper) => {
            const liked = isLiked(wallpaper.id);
            const category = categoryFor(wallpaper.categoryId);
            return (
              <div
                key={wallpaper.id}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-card border border-white/10 bg-white/[0.04]"
              >
                <img
                  src={wallpaper.thumbnailUrl || wallpaper.imageUrl}
                  alt={wallpaper.title}
                  className="block w-full h-auto object-contain transition-transform duration-[400ms] ease-out group-hover:scale-105"
                />

                {category && (
                  <Badge variant="accent" className="absolute left-2 top-2">
                    {category.name}
                  </Badge>
                )}

                {/* Hover / focus overlay with actions */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-0 transition-opacity duration-button group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="flex items-center justify-between p-3">
                    <button
                      type="button"
                      onClick={() => onLike(wallpaper)}
                      aria-label="Like"
                      className="flex items-center gap-1 text-caption text-text"
                    >
                      <Heart className={cn("h-4 w-4", liked && "fill-accent text-accent")} />
                      {wallpaper.likeCount}
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(wallpaper)}
                        aria-label={`View ${wallpaper.title} full size`}
                        className="flex h-8 w-8 items-center justify-center rounded-button bg-white/10 text-text backdrop-blur-xl transition-colors duration-button hover:bg-accent hover:text-background"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(wallpaper)}
                        aria-label={`Download ${wallpaper.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-button bg-white/10 text-text backdrop-blur-xl transition-colors duration-button hover:bg-accent hover:text-background"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
