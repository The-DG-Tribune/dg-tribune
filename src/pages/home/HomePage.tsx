import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  Users,
  Shield,
  Trophy,
  ArrowUpRight,
  Radio,
  Play,
  Heart,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { QuizCard } from "@/components/cards/EntityCards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Marquee } from "@/components/ui/Marquee";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TOOL_ICONS } from "@/constants/toolIcons";
import { ROUTES } from "@/constants/routes";
import { getThumbnailUrl } from "@/services/cloudinary/upload";
import { getCollectionDocs, getDocumentById } from "@/services/firebase/firestore";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import type {
  Article,
  Category,
  HomepageConfig,
  League,
  Player,
  Quiz,
  Team,
  Tool,
  Wallpaper,
} from "@/types/firestore";

interface HomeData {
  sections: HomepageConfig["sections"];
  articles: Article[];
  categories: Category[];
  tools: Tool[];
  wallpapers: Wallpaper[];
  quizzes: Quiz[];
  leagues: League[];
  playerCount: number;
  teamCount: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const springTransition = { type: "spring" as const, stiffness: 220, damping: 24 };

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useDocumentHead({ title: "DG Tribune" });

  async function load() {
    setError(null);
    try {
      const [homepage, articles, categories, tools, wallpapers, quizzes, leagues, players, teams] =
        await Promise.all([
          getDocumentById<HomepageConfig>("homepage", "homepage"),
          getCollectionDocs<Article>("articles", {
            where: [
              ["isDeleted", "==", false],
              ["status", "==", "published"],
            ],
          }),
          getCollectionDocs<Category>("categories", {}),
          getCollectionDocs<Tool>("tools", {
            where: [
              ["isDeleted", "==", false],
              ["isEnabled", "==", true],
            ],
          }),
          getCollectionDocs<Wallpaper>("wallpapers", {
            where: [
              ["isDeleted", "==", false],
              ["status", "==", "published"],
            ],
          }),
          getCollectionDocs<Quiz>("quizzes", {
            where: [
              ["isDeleted", "==", false],
              ["status", "==", "published"],
            ],
          }),
          getCollectionDocs<League>("leagues", {
            where: [["isDeleted", "==", false]],
          }),
          getCollectionDocs<Player>("players", {
            where: [
              ["isDeleted", "==", false],
              ["status", "==", "published"],
            ],
          }),
          getCollectionDocs<Team>("teams", {
            where: [["isDeleted", "==", false]],
          }),
        ]);

      articles.sort((a, b) => b.updatedAt - a.updatedAt);
      quizzes.sort((a, b) => b.updatedAt - a.updatedAt);
      const sections = [...(homepage?.sections ?? [])].sort((a, b) => a.order - b.order);

      setData({
        sections,
        articles,
        categories,
        tools,
        wallpapers,
        quizzes,
        leagues,
        playerCount: players.length,
        teamCount: teams.length,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <Container>
        <div className="py-16">
          <ErrorState description={error} onRetry={load} />
        </div>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container>
        <div className="py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </Container>
    );
  }

  const categoryFor = (id: string | null) => data.categories.find((c) => c.id === id);

  const heroSection = data.sections.find((s) => s.type === "hero");
  const heroArticles = heroSection
    ? data.articles.filter((a) => heroSection.itemIds.includes(a.id))
    : data.articles.slice(0, 1);
  const featuredArticle = heroArticles[0] ?? data.articles[0];
  const spotlightQuiz = data.quizzes[0];
  const spotlightTool = data.tools[0];

  if (data.articles.length === 0) {
    return (
      <Container>
        <div className="py-20">
          <EmptyState
            icon={<Sparkles className="h-6 w-6" strokeWidth={1.5} />}
            title="DG Tribune is just getting started."
            description="Once articles are published, they'll appear here for every fan to see."
          />
        </div>
      </Container>
    );
  }

  const tickerItems = [
    ...data.articles.slice(0, 6).map((a) => (
      <Link
        key={a.id}
        to={ROUTES.article(a.slug)}
        className="text-small font-medium text-text-secondary hover:text-text transition-colors duration-button whitespace-nowrap"
      >
        {a.title}
      </Link>
    )),
    ...(spotlightQuiz
      ? [
          <Link
            key={`quiz-${spotlightQuiz.id}`}
            to={ROUTES.quiz(spotlightQuiz.slug)}
            className="text-small font-semibold text-accent whitespace-nowrap"
          >
            NEW QUIZ - {spotlightQuiz.title}
          </Link>,
        ]
      : []),
  ];

  return (
    <div className="relative">
      {/* Ambient background mesh - fixed behind everything, subtle */}
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />

      <div className="relative py-8 md:py-10">
        <Container>
          {/* ---------------- Bento Hero ---------------- */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2 md:gap-5 mb-6"
          >
            {/* Featured article - large tile */}
            {featuredArticle && (
              <motion.div
                variants={fadeUp}
                transition={springTransition}
                className="md:col-span-2 md:row-span-2"
              >
                <Link to={ROUTES.article(featuredArticle.slug)} className="block h-full group">
                  <GlassCard glow className="h-full min-h-[320px] md:min-h-[420px]">
                    {featuredArticle.coverImageUrl && (
                      <img
                        src={featuredArticle.coverImageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
                      {categoryFor(featuredArticle.categoryId) && (
                        <Badge variant="accent" className="mb-3 w-fit">
                          {categoryFor(featuredArticle.categoryId)!.name}
                        </Badge>
                      )}
                      <h1 className="font-heading text-page-title md:text-hero text-text max-w-xl">
                        {featuredArticle.title}
                      </h1>
                      <p className="mt-3 text-small text-text-secondary max-w-md line-clamp-2">
                        {featuredArticle.excerpt}
                      </p>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            )}

            {/* Quiz spotlight */}
            <motion.div variants={fadeUp} transition={springTransition} className="md:col-span-2">
              <GlassCard className="h-full p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-accent" />
                  </span>
                  <span className="text-caption font-semibold uppercase tracking-wide text-accent">
                    Trending Quiz
                  </span>
                </div>
                {spotlightQuiz ? (
                  <>
                    <h3 className="font-heading text-card-title text-text mb-1">
                      {spotlightQuiz.title}
                    </h3>
                    <p className="text-small text-text-secondary mb-4 line-clamp-1">
                      {spotlightQuiz.questions.length} questions - test your knowledge
                    </p>
                    <Link to={ROUTES.quiz(spotlightQuiz.slug)}>
                      <Button size="sm" icon={<Brain className="h-4 w-4" />}>
                        Play now
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-small text-text-secondary">
                    Quizzes are on the way - check back soon.
                  </p>
                )}
              </GlassCard>
            </motion.div>

            {/* Stat tile */}
            <motion.div variants={fadeUp} transition={springTransition}>
              <GlassCard className="h-full p-5 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-heading text-card-title text-text">
                    <AnimatedCounter value={data.playerCount} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="font-heading text-card-title text-text">
                    <AnimatedCounter value={data.teamCount} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span className="font-heading text-card-title text-text">
                    <AnimatedCounter value={data.leagues.length} />
                  </span>
                </div>
                <p className="text-caption text-text-secondary">Players - Clubs - Leagues</p>
              </GlassCard>
            </motion.div>

            {/* Tool spotlight */}
            <motion.div variants={fadeUp} transition={springTransition}>
              {spotlightTool ? (
                <Link to={ROUTES.tool(spotlightTool.slug)} className="block h-full group">
                  <GlassCard className="h-full p-5 flex flex-col justify-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-button bg-accent/10 text-accent transition-transform duration-button group-hover:scale-110">
                      {(() => {
                        const Icon = TOOL_ICONS[spotlightTool.iconName];
                        return Icon ? <Icon className="h-5 w-5" /> : null;
                      })()}
                    </span>
                    <span className="text-small font-semibold text-text line-clamp-1">
                      {spotlightTool.name}
                    </span>
                    <span className="flex items-center gap-1 text-caption text-accent">
                      Try it <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </GlassCard>
                </Link>
              ) : (
                <GlassCard className="h-full p-5 flex items-center justify-center">
                  <p className="text-caption text-text-secondary">More tools coming soon</p>
                </GlassCard>
              )}
            </motion.div>
          </motion.div>

          {/* ---------------- Pulse ticker ---------------- */}
          {tickerItems.length > 0 && (
            <GlassCard className="mb-12 flex items-center gap-4 px-5 py-3">
              <span className="flex shrink-0 items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-accent">
                <Radio className="h-3.5 w-3.5" />
                Live
              </span>
              <div className="min-w-0 flex-1">
                <Marquee items={tickerItems} />
              </div>
            </GlassCard>
          )}

          {/* ---------------- Dynamic CMS sections ---------------- */}
          {/* Every section below (including Tools, Quiz Spotlight and
              Explore Leagues) is driven by the Homepage Manager in the
              dashboard - its title, order, and whether it appears at
              all are all editable there, same as articles/wallpapers. */}
          {data.sections
            .filter((s) => s.type !== "hero")
            .map((section) => {
              if (
                section.type === "featured" ||
                section.type === "latest" ||
                section.type === "trending"
              ) {
                let items: Article[];
                if (section.type === "featured") {
                  items = data.articles.filter((a) => section.itemIds.includes(a.id));
                } else if (section.type === "trending") {
                  items = [...data.articles]
                    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
                    .slice(0, 6);
                } else {
                  items = data.articles.slice(0, 6);
                }

                if (items.length === 0) return null;

                return (
                  <motion.section
                    key={section.id}
                    className="mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={springTransition}
                  >
                    <h2 className="font-heading text-section-title text-text mb-5">
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          category={categoryFor(article.categoryId)}
                        />
                      ))}
                    </div>
                  </motion.section>
                );
              }

              if (section.type === "tools" && data.tools.length > 0) {
                return (
                  <motion.section
                    key={section.id}
                    className="mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={springTransition}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-heading text-section-title text-text">
                        {section.title}
                      </h2>
                      <Link
                        to={ROUTES.tools}
                        className="text-small font-medium text-accent hover:opacity-80 transition-opacity duration-button"
                      >
                        See all
                      </Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {data.tools
                        .sort((a, b) => a.order - b.order)
                        .map((tool, i) => {
                          const Icon = TOOL_ICONS[tool.iconName];
                          const gradients = [
                            "from-accent/20 to-transparent",
                            "from-accent-secondary/20 to-transparent",
                            "from-accent/10 via-accent-secondary/10 to-transparent",
                          ];
                          return (
                            <Link
                              key={tool.id}
                              to={ROUTES.tool(tool.slug)}
                              className="group shrink-0 snap-start"
                            >
                              <GlassCard
                                className={`h-36 w-40 bg-gradient-to-br ${gradients[i % gradients.length]} p-4 flex flex-col justify-between transition-transform duration-card group-hover:-translate-y-1 group-hover:scale-[1.03]`}
                              >
                                <span className="flex h-9 w-9 items-center justify-center rounded-button bg-white/10 text-accent">
                                  {Icon && <Icon className="h-5 w-5" />}
                                </span>
                                <span className="text-small font-semibold text-text line-clamp-2">
                                  {tool.name}
                                </span>
                              </GlassCard>
                            </Link>
                          );
                        })}
                    </div>
                    <p className="mt-3 text-caption text-text-secondary">
                      Tools are being built one at a time - some may not be live yet.
                    </p>
                  </motion.section>
                );
              }

              if (section.type === "quiz-spotlight" && data.quizzes.length > 0) {
                return (
                  <motion.section
                    key={section.id}
                    className="mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={springTransition}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-heading text-section-title text-text">
                        {section.title}
                      </h2>
                      <Link
                        to={ROUTES.quizzes}
                        className="text-small font-medium text-accent hover:opacity-80 transition-opacity duration-button"
                      >
                        See all
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                      {data.quizzes.slice(0, 4).map((quiz) => (
                        <QuizCard key={quiz.id} quiz={quiz} />
                      ))}
                    </div>
                  </motion.section>
                );
              }

              if (section.type === "leagues" && data.leagues.length > 0) {
                return (
                  <motion.section
                    key={section.id}
                    className="mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={springTransition}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-heading text-section-title text-text">
                        {section.title}
                      </h2>
                      <Link
                        to={ROUTES.leagues}
                        className="text-small font-medium text-accent hover:opacity-80 transition-opacity duration-button"
                      >
                        See all
                      </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {data.leagues.map((league) => (
                        <Link
                          key={league.id}
                          to={ROUTES.league(league.slug)}
                          className="group shrink-0"
                        >
                          <GlassCard className="flex items-center gap-3 px-4 py-3 transition-transform duration-card group-hover:-translate-y-0.5">
                            {league.logoUrl ? (
                              <img src={league.logoUrl} alt="" className="h-8 w-8 object-contain" />
                            ) : (
                              <Trophy className="h-6 w-6 text-accent" />
                            )}
                            <span className="text-small font-medium text-text whitespace-nowrap">
                              {league.name}
                            </span>
                          </GlassCard>
                        </Link>
                      ))}
                    </div>
                  </motion.section>
                );
              }

              if (section.type === "wallpapers" && data.wallpapers.length > 0) {
                const previewStack = data.wallpapers.slice(0, 3);
                return (
                  <motion.section
                    key={section.id}
                    className="mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={springTransition}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-heading text-section-title text-text">
                        {section.title}
                      </h2>
                      <Link
                        to={ROUTES.wallpapers}
                        className="text-small font-medium text-accent hover:opacity-80 transition-opacity duration-button"
                      >
                        See all
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Reels teaser - a stacked phone-style peek, links straight into Reels mode */}
                      <Link
                        to={`${ROUTES.wallpapers}?tab=reels`}
                        className="group relative block aspect-[3/2] md:aspect-auto overflow-hidden rounded-container border border-white/10 md:row-span-1"
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent-secondary/10">
                          {previewStack.map((wallpaper, i) => (
                            <img
                              key={wallpaper.id}
                              src={getThumbnailUrl(wallpaper.thumbnailUrl || wallpaper.imageUrl, 200)}
                              alt=""
                              style={{
                                transform: `rotate(${(i - 1) * 8}deg) translateX(${(i - 1) * 18}px)`,
                                zIndex: i === 1 ? 2 : 1,
                              }}
                              className="h-32 w-20 shrink-0 rounded-image border-2 border-background object-cover shadow-glass transition-transform duration-[400ms] group-hover:scale-105"
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-background">
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </span>
                          <div>
                            <p className="text-small font-semibold text-text">Watch in Reels</p>
                            <p className="text-caption text-text-secondary">Swipe through - like &amp; download</p>
                          </div>
                        </div>
                      </Link>

                      {/* Grid thumbnail preview */}
                      <div className="md:col-span-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {data.wallpapers.slice(0, 8).map((wallpaper) => (
                          <Link
                            key={wallpaper.id}
                            to={ROUTES.wallpapers}
                            className="group relative aspect-[9/16] overflow-hidden rounded-card border border-white/10 bg-white/[0.04]"
                          >
                            <img
                              src={getThumbnailUrl(wallpaper.thumbnailUrl || wallpaper.imageUrl, 300)}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-card group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-background/80 to-transparent p-1.5 opacity-0 transition-opacity duration-button group-hover:opacity-100">
                              <Heart className="h-3 w-3 fill-accent text-accent" />
                              <span className="text-caption text-text">{wallpaper.likeCount}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                );
              }

              return null;
            })}
        </Container>
      </div>
    </div>
  );
}
