import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getThumbnailUrl } from "@/services/cloudinary/upload";
import { clearRecentArticles, getRecentArticles, type RecentArticle } from "@/utils/recentArticles";

/** "Pick up where you left off" - shows the last few articles this visitor opened. Hidden when empty. */
export function ContinueReading() {
  const [items, setItems] = useState<RecentArticle[]>(() => getRecentArticles().slice(0, 4));

  if (items.length === 0) return null;

  return (
    <section className="mb-10" aria-label="Continue reading">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-section-title text-text">
          <BookOpen className="h-5 w-5 text-accent" />
          Continue reading
        </h2>
        <button
          type="button"
          onClick={() => {
            clearRecentArticles();
            setItems([]);
          }}
          className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-text"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={item.slug}
            to={ROUTES.article(item.slug)}
            className="flex w-64 shrink-0 items-center gap-3 rounded-card border border-white/10 bg-white/[0.04] p-2.5 transition-colors hover:border-accent/40"
          >
            {item.coverImageUrl ? (
              <img
                loading="lazy"
                decoding="async"
                src={getThumbnailUrl(item.coverImageUrl, 160)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-button object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-button bg-background" />
            )}
            <p className="line-clamp-2 text-small font-medium text-text">{item.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
