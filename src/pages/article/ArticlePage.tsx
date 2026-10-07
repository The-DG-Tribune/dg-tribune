import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Share2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/formatDate";
import { shareUrl } from "@/utils/wallpaperActions";
import { useToast } from "@/context/ToastContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import {
  getDocumentBySlug,
  getCollectionDocs,
  incrementField,
} from "@/services/firebase/firestore";
import type { Article, Category } from "@/types/firestore";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);
  const hasCountedView = useRef(false);

  async function load() {
    if (!slug) return;
    setError(null);
    setNotFound(false);
    try {
      const [found, allCategories, allArticles] = await Promise.all([
        getDocumentBySlug<Article>("articles", slug),
        getCollectionDocs<Category>("categories", {}),
        getCollectionDocs<Article>("articles", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
      ]);
      if (!found || found.status !== "published" || found.isDeleted) {
        setNotFound(true);
        return;
      }
      setArticle(found);
      setCategories(allCategories);
      setCategory(allCategories.find((c) => c.id === found.categoryId) ?? null);
      setRelated(
        allArticles
          .filter((a) => a.id !== found.id && a.categoryId === found.categoryId)
          .slice(0, 3)
      );

      if (!hasCountedView.current) {
        hasCountedView.current = true;
        incrementField("articles", found.id, "viewCount");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    function handleScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useDocumentHead({
    title: article?.title ?? "Article",
    description: article?.excerpt,
    image: article?.coverImageUrl,
    type: "article",
  });

  async function handleShare() {
    if (!article) return;
    const result = await shareUrl(window.location.href, article.title);
    if (result === "copied") showToast("Link copied");
  }

  if (error) {
    return (
      <Container>
        <div className="py-16">
          <ErrorState description={error} onRetry={load} />
        </div>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">
            Article not found
          </h1>
          <p className="text-body text-text-secondary mb-6">
            This article may have been moved or unpublished.
          </p>
          <Link to={ROUTES.football} className="text-accent underline">
            Back to Football
          </Link>
        </div>
      </Container>
    );
  }

  if (!article) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading article…" />
        </div>
      </Container>
    );
  }

  return (
    <article className="relative">
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-0.5 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-secondary transition-[width] duration-150"
          style={{ width: `${readProgress * 100}%` }}
        />
      </div>

      {/* Hero image with overlaid title */}
      {article.coverImageUrl ? (
        <div className="relative w-full aspect-[16/8] md:aspect-[16/6] bg-surface overflow-hidden">
          <img
            src={article.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <Container className="absolute inset-x-0 bottom-0 pb-8">
            <div className="max-w-2xl mx-auto">
              {category && (
                <Badge variant="accent" className="mb-3">
                  {category.name}
                </Badge>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 26 }}
                className="font-heading text-page-title md:text-hero text-text leading-tight"
              >
                {article.title}
              </motion.h1>
            </div>
          </Container>
        </div>
      ) : (
        <Container>
          <div className="max-w-2xl mx-auto pt-10">
            {category && (
              <Badge variant="accent" className="mb-3">
                {category.name}
              </Badge>
            )}
            <h1 className="font-heading text-page-title text-text leading-tight">
              {article.title}
            </h1>
          </div>
        </Container>
      )}

      <Container>
        <div className="max-w-2xl mx-auto py-8">
          <Link
            to={ROUTES.football}
            className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-6 transition-colors duration-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Football
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5 mb-8">
            <div className="flex items-center gap-3 text-small text-text-secondary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 font-heading text-caption font-bold text-accent">
                {article.authorName?.[0]?.toUpperCase() ?? "D"}
              </span>
              <span>{article.authorName}</span>
              <span>·</span>
              <span>{formatDate(article.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-small text-text-secondary">
                <Eye className="h-4 w-4" />
                {article.viewCount.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share"
                className="flex items-center gap-1.5 text-small text-text-secondary transition-colors duration-button hover:text-accent"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-body text-text whitespace-pre-wrap leading-relaxed space-y-4"
          >
            {article.body}
          </motion.div>

          {article.tags?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-caption text-text-secondary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div className="max-w-4xl mx-auto pb-16">
            <h2 className="font-heading text-section-title text-text mb-5">
              More like this
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} category={categories.find((c) => c.id === a.categoryId)} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </article>
  );
}
