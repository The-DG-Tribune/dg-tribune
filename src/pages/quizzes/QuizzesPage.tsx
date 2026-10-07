import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Play } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuizCard } from "@/components/cards/EntityCards";
import { QuizCoverArt } from "@/components/quiz/QuizCoverArt";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ROUTES } from "@/constants/routes";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Quiz } from "@/types/firestore";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Quiz>("quizzes", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setQuizzes(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const [featured, ...rest] = quizzes ?? [];

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />
      <Container className="relative">
        <div className="py-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-secondary text-background">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-page-title text-text">Quizzes</h1>
              <p className="text-small text-text-secondary">
                Test your football knowledge. New quizzes added regularly.
              </p>
            </div>
          </div>

          {error ? (
            <ErrorState description={error} onRetry={load} />
          ) : quizzes === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-6 w-6" strokeWidth={1.5} />}
              title="No quizzes yet."
              description="Check back soon - new quizzes are added regularly."
            />
          ) : (
            <>
              {/* Featured quiz - the newest one, given a bigger spotlight */}
              {featured && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="mb-8"
                >
                  <Link to={ROUTES.quiz(featured.slug)} className="group block">
                    <GlassCard glow className="relative overflow-hidden">
                      <div className="absolute inset-0 transition-transform duration-[600ms] group-hover:scale-105">
                        <QuizCoverArt title={featured.title} iconClassName="h-20 w-20 opacity-60" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
                      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 p-6 sm:p-8 min-h-[180px]">
                        <div>
                          <span className="mb-2 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-accent">
                            Newest Quiz
                          </span>
                          <h2 className="font-heading text-page-title text-text mb-1">
                            {featured.title}
                          </h2>
                          <p className="text-small text-text-secondary max-w-md">
                            {featured.questions.length} questions - {featured.description}
                          </p>
                        </div>
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-transform duration-button group-hover:scale-110">
                          <Play className="h-5 w-5 fill-current" />
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              )}

              {rest.length > 0 && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  {rest.map((quiz) => (
                    <motion.div
                      key={quiz.id}
                      variants={fadeUp}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    >
                      <QuizCard quiz={quiz} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
