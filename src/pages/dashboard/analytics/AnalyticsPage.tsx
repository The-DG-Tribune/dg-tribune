import { useEffect, useState } from "react";
import { FileText, Download, Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/cards/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Article, Quiz, Wallpaper } from "@/types/firestore";
import { getCollectionDocs } from "@/services/firebase/firestore";

interface Stats {
  totalViews: number;
  totalDownloads: number;
  totalPlays: number;
  topArticles: Article[];
  topWallpapers: Wallpaper[];
  topQuizzes: Quiz[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setStats(null);
    try {
      const [articlesR, wallpapersR, quizzesR] = await Promise.allSettled([
        getCollectionDocs<Article>("articles", { where: [["isDeleted", "==", false]] }),
        getCollectionDocs<Wallpaper>("wallpapers", { where: [["isDeleted", "==", false]] }),
        getCollectionDocs<Quiz>("quizzes", { where: [["isDeleted", "==", false]] }),
      ]);
      if (articlesR.status === "rejected") console.error("[Analytics] articles failed:", articlesR.reason);
      if (wallpapersR.status === "rejected") console.error("[Analytics] wallpapers failed:", wallpapersR.reason);
      if (quizzesR.status === "rejected") console.error("[Analytics] quizzes failed:", quizzesR.reason);
      const articles = articlesR.status === "fulfilled" ? articlesR.value : [];
      const wallpapers = wallpapersR.status === "fulfilled" ? wallpapersR.value : [];
      const quizzes = quizzesR.status === "fulfilled" ? quizzesR.value : [];
      if (articlesR.status === "rejected" && wallpapersR.status === "rejected" && quizzesR.status === "rejected") {
        throw new Error("We couldn't load analytics right now. Check the browser console (F12) for details.");
      }

      const totalViews = articles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
      const totalDownloads = wallpapers.reduce(
        (sum, w) => sum + (w.downloadCount || 0),
        0
      );
      const totalPlays = quizzes.reduce((sum, q) => sum + (q.playCount || 0), 0);

      setStats({
        totalViews,
        totalDownloads,
        totalPlays,
        topArticles: [...articles]
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 5),
        topWallpapers: [...wallpapers]
          .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
          .slice(0, 5),
        topQuizzes: [...quizzes]
          .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
          .slice(0, 5),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <Badge variant="accent" className="mb-3">
          Phase 6 · CMS Modules
        </Badge>
        <h1 className="font-heading text-page-title text-text">Analytics</h1>
        <p className="text-small text-text-secondary mt-1">
          Real counts from your content - article views, wallpaper
          downloads, and quiz plays increase automatically as visitors use
          the public site (built starting Phase 7).
        </p>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-button bg-accent/10 text-accent mb-4">
                <Eye className="h-5 w-5" />
              </span>
              <p className="font-heading text-page-title text-text leading-none mb-1">
                {stats.totalViews.toLocaleString()}
              </p>
              <p className="text-small text-text-secondary">Total article views</p>
            </Card>
            <Card className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-button bg-accent-secondary/10 text-accent-secondary mb-4">
                <Download className="h-5 w-5" />
              </span>
              <p className="font-heading text-page-title text-text leading-none mb-1">
                {stats.totalDownloads.toLocaleString()}
              </p>
              <p className="text-small text-text-secondary">Wallpaper downloads</p>
            </Card>
            <Card className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-button bg-warning/10 text-warning mb-4">
                <Play className="h-5 w-5" />
              </span>
              <p className="font-heading text-page-title text-text leading-none mb-1">
                {stats.totalPlays.toLocaleString()}
              </p>
              <p className="text-small text-text-secondary">Quiz plays</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="font-heading text-card-title text-text mb-3">
                Top Articles
              </h2>
              {stats.topArticles.length === 0 ? (
                <EmptyState title="No articles yet." />
              ) : (
                <ul className="space-y-2">
                  {stats.topArticles.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-button border border-border bg-surface px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 min-w-0 text-small text-text">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                        <span className="truncate">{a.title}</span>
                      </span>
                      <span className="shrink-0 text-caption text-text-secondary">
                        {(a.viewCount || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-heading text-card-title text-text mb-3">
                Top Wallpapers
              </h2>
              {stats.topWallpapers.length === 0 ? (
                <EmptyState title="No wallpapers yet." />
              ) : (
                <ul className="space-y-2">
                  {stats.topWallpapers.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-button border border-border bg-surface px-3 py-2.5"
                    >
                      <span className="truncate text-small text-text">
                        {w.title}
                      </span>
                      <span className="shrink-0 text-caption text-text-secondary">
                        {(w.downloadCount || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-heading text-card-title text-text mb-3">
                Top Quizzes
              </h2>
              {stats.topQuizzes.length === 0 ? (
                <EmptyState title="No quizzes yet." />
              ) : (
                <ul className="space-y-2">
                  {stats.topQuizzes.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-button border border-border bg-surface px-3 py-2.5"
                    >
                      <span className="truncate text-small text-text">
                        {q.title}
                      </span>
                      <span className="shrink-0 text-caption text-text-secondary">
                        {(q.playCount || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
