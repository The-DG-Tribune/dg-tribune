import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Users, Shield, Flame, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { ROUTES } from "@/constants/routes";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Article, Category, ShortUpdate } from "@/types/firestore";

interface FootballData {
  articles: Article[];
  categories: Category[];
  shortUpdates: ShortUpdate[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const exploreLinks = [
  { label: "Players", href: ROUTES.players, icon: Users },
  { label: "Teams", href: ROUTES.teams, icon: Shield },
  { label: "Leagues", href: ROUTES.leagues, icon: Trophy },
];

export default function FootballHub() {
  const [data, setData] = useState<FootballData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [articles, categories, shortUpdates] = await Promise.all([
        getCollectionDocs<Article>("articles", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
        getCollectionDocs<Category>("categories", {}),
        getCollectionDocs<ShortUpdate>("shortUpdates", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
      ]);
      articles.sort((a, b) => b.updatedAt - a.updatedAt);
      shortUpdates.sort((a, b) => b.createdAt - a.createdAt);
      setData({ articles, categories, shortUpdates: shortUpdates.slice(0, 5) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categoryFor = (id: string | null) =>
    data?.categories.find((c) => c.id === id);

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />
      <Container className="relative">
        <div className="py-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-secondary text-background">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-page-title text-text">Football</h1>
              <p className="text-small text-text-secondary">
                All the latest news, updates, and stories.
              </p>
            </div>
          </div>

          <div className="mb-10 flex flex-wrap gap-3">
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-small font-medium text-text transition-colors duration-button hover:border-accent/40 hover:text-accent"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {error ? (
            <ErrorState description={error} onRetry={load} />
          ) : !data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <h2 className="font-heading text-section-title text-text mb-5">
                  Latest Articles
                </h2>
                {data.articles.length === 0 ? (
                  <EmptyState
                    title="No articles yet."
                    description="Check back soon for the latest football news."
                  />
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                  >
                    {data.articles.map((article) => (
                      <motion.div
                        key={article.id}
                        variants={fadeUp}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      >
                        <ArticleCard
                          article={article}
                          category={categoryFor(article.categoryId)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-heading text-section-title text-text flex items-center gap-2">
                    <Flame className="h-4 w-4 text-accent" />
                    Hot Takes
                  </h2>
                  <Link
                    to={ROUTES.hotTakes}
                    className="text-small font-medium text-accent hover:opacity-80 transition-opacity duration-button"
                  >
                    See all
                  </Link>
                </div>
                {data.shortUpdates.length === 0 ? (
                  <EmptyState title="No hot takes yet." />
                ) : (
                  <div className="space-y-3">
                    {data.shortUpdates.map((update) => (
                      <Link key={update.id} to={ROUTES.hotTakes} className="group block">
                        <GlassCard className="p-4 transition-colors duration-card group-hover:border-white/20">
                          <p className="text-small text-text whitespace-pre-wrap mb-2 line-clamp-3">
                            {update.text}
                          </p>
                          <div className="flex items-center justify-between text-caption text-text-secondary">
                            <span>{formatRelativeTime(update.createdAt)}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity duration-button group-hover:opacity-100" />
                          </div>
                        </GlassCard>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
