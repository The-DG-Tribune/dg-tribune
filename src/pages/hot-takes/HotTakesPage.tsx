import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Share2,
  Download,
  Flame,
  BadgeCheck,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  X,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/context/ToastContext";
import { useHotTakeLikes } from "@/hooks/useHotTakeLikes";
import { shareUrl } from "@/utils/wallpaperActions";
import { downloadHotTakeCard } from "@/utils/hotTakeCard";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { getCollectionDocs } from "@/services/firebase/firestore";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import type { Article, ShortUpdate } from "@/types/firestore";

type Tab = "for-you" | "trending";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-text backdrop-blur-xl"
          >
            <X className="h-5 w-5" />
          </button>
          <motion.img
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            src={url}
            alt=""
            className="max-h-[85vh] max-w-[92vw] rounded-image object-contain shadow-glass"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function HotTakesPage() {
  const { showToast } = useToast();
  const { isLiked, toggleLike } = useHotTakeLikes();

  const [tab, setTab] = useState<Tab>("for-you");
  const [updates, setUpdates] = useState<ShortUpdate[] | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [updateDocs, articleDocs] = await Promise.all([
        getCollectionDocs<ShortUpdate>("shortUpdates", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
        getCollectionDocs<Article>("articles", {
          where: [["isDeleted", "==", false]],
        }),
      ]);
      updateDocs.sort((a, b) => b.createdAt - a.createdAt);
      setUpdates(updateDocs);
      setArticles(articleDocs);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleLike(update: ShortUpdate) {
    const nowLiked = toggleLike(update.id);
    setUpdates((prev) =>
      prev
        ? prev.map((u) =>
            u.id === update.id ? { ...u, likeCount: u.likeCount + (nowLiked ? 1 : -1) } : u
          )
        : prev
    );
  }

  async function handleShare(update: ShortUpdate) {
    const url = `${window.location.origin}${ROUTES.hotTakes}?take=${update.slug}`;
    const result = await shareUrl(url, update.text.slice(0, 60));
    if (result === "copied") showToast("Link copied");
  }

  async function handleDownload(update: ShortUpdate) {
    setDownloadingId(update.id);
    try {
      await downloadHotTakeCard(update);
      showToast("Card downloaded - share it anywhere");
    } catch {
      showToast("Couldn't generate the card - try again", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  const linkedArticle = (id: string | null) => articles.find((a) => a.id === id);

  const sortedUpdates =
    updates === null
      ? null
      : tab === "trending"
      ? [...updates].sort((a, b) => b.likeCount - a.likeCount)
      : updates;

  const totalLikes = updates?.reduce((sum, u) => sum + u.likeCount, 0) ?? 0;

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />
      <Container className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,600px)_1fr] gap-8 py-10">
          {/* Main feed column */}
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-secondary text-background">
                <Flame className="h-5 w-5" fill="currentColor" />
              </span>
              <div>
                <h1 className="font-heading text-page-title text-text">Hot Takes</h1>
                <p className="text-small text-text-secondary">
                  Unfiltered football opinions. No boring takes.
                </p>
              </div>
            </div>

            {/* Tabs - For You / Trending */}
            <div className="mb-6 flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setTab("for-you")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-small font-medium transition-colors duration-button",
                  tab === "for-you" ? "bg-accent text-background" : "text-text-secondary hover:text-text"
                )}
              >
                <Sparkles className="h-4 w-4" />
                For You
              </button>
              <button
                type="button"
                onClick={() => setTab("trending")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-small font-medium transition-colors duration-button",
                  tab === "trending" ? "bg-accent text-background" : "text-text-secondary hover:text-text"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </button>
            </div>

            {error ? (
              <ErrorState description={error} onRetry={load} />
            ) : sortedUpdates === null ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : sortedUpdates.length === 0 ? (
              <EmptyState
                icon={<Flame className="h-6 w-6" strokeWidth={1.5} />}
                title="No hot takes yet."
                description="Check back soon - the takes are coming."
              />
            ) : (
              <div className="space-y-4">
                {sortedUpdates.map((update, i) => {
                  const liked = isLiked(update.id);
                  const article = linkedArticle(update.linkedArticleId);
                  return (
                    <motion.div
                      key={update.id}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-40px" }}
                      variants={fadeUp}
                      transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(i, 4) * 0.04 }}
                    >
                      <GlassCard className="p-5 transition-colors duration-card hover:border-white/20">
                        <div className="flex gap-3">
                          {/* DG-branded avatar, not a generic person icon */}
                          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-secondary/25 font-heading text-small font-bold text-accent">
                            DG
                            <BadgeCheck className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background text-accent" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-small font-semibold text-text">DG Tribune</span>
                              <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                              <span className="text-caption text-text-secondary">
                                · {formatRelativeTime(update.createdAt)}
                              </span>
                            </div>

                            <p className="mt-1 whitespace-pre-wrap text-body text-text">
                              {update.text}
                            </p>

                            {update.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(update.imageUrl)}
                                className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-image border border-white/10"
                              >
                                <img
                                  src={update.imageUrl}
                                  alt=""
                                  className="max-h-80 w-full object-cover object-top"
                                />
                              </button>
                            )}

                            {article && (
                              <Link
                                to={ROUTES.article(article.slug)}
                                className="mt-3 flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.03] p-3 transition-colors duration-button hover:border-accent/30"
                              >
                                {article.coverImageUrl && (
                                  <img
                                    src={article.coverImageUrl}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded-button object-cover object-top"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-small font-medium text-text">
                                    {article.title}
                                  </p>
                                  <p className="text-caption text-text-secondary">Read the full story</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-accent" />
                              </Link>
                            )}

                            <div className="mt-3 flex items-center gap-5">
                              <button
                                type="button"
                                onClick={() => handleLike(update)}
                                aria-label="Like"
                                className="flex items-center gap-1.5 text-text-secondary transition-colors duration-button hover:text-accent"
                              >
                                <motion.span
                                  key={liked ? "liked" : "unliked"}
                                  initial={{ scale: 0.7 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                                >
                                  <Heart
                                    className={cn("h-4 w-4", liked && "fill-accent text-accent")}
                                  />
                                </motion.span>
                                <span className="text-caption">{update.likeCount}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleShare(update)}
                                aria-label="Share"
                                className="flex items-center gap-1.5 text-text-secondary transition-colors duration-button hover:text-text"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownload(update)}
                                disabled={downloadingId === update.id}
                                aria-label="Download as image"
                                className="flex items-center gap-1.5 text-text-secondary transition-colors duration-button hover:text-accent disabled:opacity-50"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right rail - desktop only, keeps the layout from feeling
              empty on wide screens without squeezing the feed itself */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <GlassCard className="p-5">
                <h2 className="mb-3 font-heading text-card-title text-text">At a glance</h2>
                <div className="flex items-center justify-between text-small">
                  <span className="text-text-secondary">Hot takes</span>
                  <span className="font-semibold text-text">{updates?.length ?? 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-small">
                  <span className="text-text-secondary">Total likes</span>
                  <span className="font-semibold text-text">{totalLikes.toLocaleString()}</span>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h2 className="mb-3 font-heading text-card-title text-text">Explore more</h2>
                <div className="space-y-2">
                  <Link
                    to={ROUTES.football}
                    className="block text-small text-text-secondary transition-colors duration-button hover:text-accent"
                  >
                    Latest football news →
                  </Link>
                  <Link
                    to={ROUTES.quizzes}
                    className="block text-small text-text-secondary transition-colors duration-button hover:text-accent"
                  >
                    Play a quiz →
                  </Link>
                  <Link
                    to={ROUTES.wallpapers}
                    className="block text-small text-text-secondary transition-colors duration-button hover:text-accent"
                  >
                    Browse wallpapers →
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </Container>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
